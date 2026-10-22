// @vitest-environment node
// La CLI de la bandeja de punta a punta (S11, F3), contra carpetas temporales: ni el crudo real ni la planeadora se tocan.
// Es el flujo que sigue `/bandeja` con una edición NUEVA: el PDF sin transcripción es trabajo pendiente, seguir pendiente
// después de unir las lecturas (`unida-N.json` no es el entregable), y dejar de serlo solo cuando `entregar` valida y entrega.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "..");
const CRUDO = "scripts/vivienda-nueva/crudo";

let temporal: string;
let fuentes: string;
let salida: string;

beforeEach(() => {
  temporal = mkdtempSync(join(tmpdir(), "bandeja-"));
  fuentes = join(temporal, "fuentes");
  salida = join(temporal, "salida");
  mkdirSync(fuentes, { recursive: true });
  mkdirSync(join(salida, CRUDO), { recursive: true });
});
afterEach(() => rmSync(temporal, { recursive: true, force: true }));

function bandeja(...args: string[]) {
  const r = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "scripts/bandeja/bandeja.mjs",
      ...args,
    ],
    {
      cwd: RAIZ,
      encoding: "utf8",
      env: { ...process.env, BANDEJA_FUENTES: fuentes, BANDEJA_SALIDA: salida },
    },
  );
  return { codigo: r.status, texto: `${r.stdout}${r.stderr}` };
}

// Una edición sintética y completa (68 páginas sin proyectos): lo que `validar.mjs --unir` deja en `unida-N.json`.
const edicion = (numero: number, extra: Record<string, unknown> = {}) => ({
  edicion: numero,
  paginas: Array.from({ length: 68 }, (_, i) => ({
    pagina: i + 1,
    tipo: "portada",
    proyectos: [],
    avisos_al_agente: [],
  })),
  proyectos: [
    {
      nombre: "Proyecto de Prueba",
      constructora: "Constructora de Prueba",
      tipo: "apartamento",
      ciudad: "Bogotá",
      sector: "no_lo_dice",
      segmento: "VIS",
      precio_desde: 250_000_000,
      area_construida_desde: 56,
      area_construida_hasta: null,
      area_privada_desde: 50,
      area_privada_hasta: null,
      etapa: "no_lo_dice",
      entrega: "no_lo_dice",
      entrega_precision: null,
      parqueadero: "no_lo_dice",
      parqueadero_precio: null,
      precio_fijo: "no_lo_dice",
      subsidio_anunciado: "no_lo_dice",
      rotulos: [],
      apariciones: [1],
      region: "bogota",
      clave: "constructora de prueba|proyecto de prueba",
      en_conflicto: [],
    },
  ],
  conflictos: [],
  reconciliados: [],
  paginasSinLeer: [],
  paginasRepetidas: [],
  ...extra,
});
const escribirUnida = (numero: number, contenido: unknown) =>
  writeFileSync(
    join(salida, CRUDO, `unida-${numero}.json`),
    JSON.stringify(contenido),
  );
const pdf = (nombre: string) => writeFileSync(join(fuentes, nombre), "");

describe("la CLI de la bandeja con una edición nueva", () => {
  it("el PDF sin transcripción es pendiente; unir las lecturas no lo entrega; entregar sí", () => {
    pdf("2026-11-edicion-188.pdf");
    expect(bandeja("listar", "--hoy", "2026-11-16").texto).toContain(
      "edicion-del-mes-188 · pendiente",
    );

    // `validar.mjs --unir` deja `unida-188.json`: el trabajo SIGUE pendiente (no es el entregable).
    escribirUnida(188, edicion(188));
    expect(bandeja("listar", "--hoy", "2026-11-16").texto).toContain(
      "edicion-del-mes-188 · pendiente",
    );

    const e = bandeja(
      "entregar",
      "edicion-del-mes-188",
      join(salida, CRUDO, "unida-188.json"),
      "--modelo",
      "sonnet",
      "--duracion-s",
      "5",
      "--hoy",
      "2026-11-16",
    );
    expect(e.codigo).toBe(0);
    expect(existsSync(join(salida, CRUDO, "edicion-188.json"))).toBe(true);
    // El registro deja la muestra PENDIENTE: nadie la ha revisado todavía.
    const registro = readFileSync(
      join(salida, "scripts/bandeja/registro/corridas.jsonl"),
      "utf8",
    );
    expect(JSON.parse(registro.trim())).toMatchObject({
      trabajo: "edicion-del-mes-188",
      modelo: "sonnet",
      procesados: 1,
      muestra_revisada: "pendiente:doble_lectura",
    });
    // Y ya no está pendiente.
    expect(bandeja("listar", "--hoy", "2026-11-16").texto).not.toContain(
      "edicion-del-mes-188",
    );
  });

  it("una salida incompleta o de otra edición se rechaza y no escribe nada", () => {
    pdf("2026-11-edicion-188.pdf");
    const argumentos = (archivo: string) => [
      "entregar",
      "edicion-del-mes-188",
      archivo,
      "--modelo",
      "sonnet",
      "--duracion-s",
      "5",
      "--hoy",
      "2026-11-16",
    ];
    escribirUnida(188, edicion(188, { paginasSinLeer: [7] }));
    const sinLeer = bandeja(
      ...argumentos(join(salida, CRUDO, "unida-188.json")),
    );
    expect(sinLeer.codigo).toBe(1);
    expect(sinLeer.texto).toContain("paginas_sin_leer");

    escribirUnida(188, edicion(187));
    const otra = bandeja(...argumentos(join(salida, CRUDO, "unida-188.json")));
    expect(otra.codigo).toBe(1);
    expect(otra.texto).toContain("edicion_distinta");

    expect(existsSync(join(salida, CRUDO, "edicion-188.json"))).toBe(false);
  });

  it("una edición vencida no se entrega sin el «sí» del usuario", () => {
    pdf("2026-11-edicion-188.pdf");
    escribirUnida(188, edicion(188));
    const base = [
      "entregar",
      "edicion-del-mes-188",
      join(salida, CRUDO, "unida-188.json"),
      "--modelo",
      "sonnet",
      "--duracion-s",
      "5",
      "--hoy",
      "2026-12-16",
    ];
    expect(bandeja("listar", "--hoy", "2026-12-16").texto).toContain("vencido");
    const sinSi = bandeja(...base);
    expect(sinSi.codigo).toBe(1);
    expect(existsSync(join(salida, CRUDO, "edicion-188.json"))).toBe(false);
    expect(bandeja(...base, "--autoriza-vencido").codigo).toBe(0);
    expect(existsSync(join(salida, CRUDO, "edicion-188.json"))).toBe(true);
  });

  it("lo que no sigue el nombre de una edición no se toca, y la edición ya transcrita no se lista", () => {
    pdf("2026-10-edicion-187.pdf");
    pdf("notas.pdf");
    writeFileSync(join(salida, CRUDO, "edicion-187.json"), "{}");
    const l = bandeja("listar", "--hoy", "2026-10-20");
    expect(l.codigo).toBe(0);
    expect(l.texto).not.toContain("edicion-del-mes-187");
    expect(l.texto).toContain("no siguen el nombre");
  });
});
