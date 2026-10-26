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
      env: {
        ...process.env,
        BANDEJA_FUENTES: fuentes,
        BANDEJA_SALIDA: salida,
        // Una base que NO es local y una llave ficticia: la CLI debe negarse antes de abrir ninguna conexión.
        SUPABASE_URL: "https://proyecto-de-prueba.supabase.test",
        SUPABASE_SERVICE_ROLE_KEY: "llave-de-prueba-sin-valor",
      },
    },
  );
  return { codigo: r.status, texto: `${r.stdout}${r.stderr}` };
}

// Una edición sintética y completa (68 páginas sin proyectos): lo que `validar.mjs --unir` deja en `unida-N.json`.
const edicion = (
  numero: number,
  extra: Record<string, unknown> = {},
  total = 68,
) => ({
  edicion: numero,
  paginas: Array.from({ length: total }, (_, i) => ({
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

// Cada prueba lanza la CLI varias veces (un proceso de Node por llamada): con la suite entera en paralelo pasaba de los 5 s.
describe("la CLI de la bandeja con una edición nueva", { timeout: 30_000 }, () => {
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
    // S13: el archivo entregado lleva su meta (número y páginas del archivo; vigencia del nombre del PDF).
    expect(
      JSON.parse(readFileSync(join(salida, CRUDO, "edicion-188.json"), "utf8"))
        .meta,
    ).toEqual({
      numero: 188,
      nombre: "Estrenar Vivienda",
      desde: "2026-11-15",
      hasta: "2026-12-15",
      paginas: 68,
    });
    expect(e.texto).toContain("vigencia 2026-11-15 → 2026-12-15");
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
    // Ya no está pendiente: está LISTO (falta cargarlo a la base y publicarlo tras la revisión).
    const despues = bandeja("listar", "--hoy", "2026-11-16").texto;
    expect(despues).not.toContain("edicion-del-mes-188 · pendiente");
    expect(despues).toContain("edicion-del-mes-188 · listo");
  });

  it("S13 · una edición de 12 páginas (no 68) entra sin tocar código; --paginas la contrasta con el PDF y la portada puede mandar", () => {
    pdf("2026-11-edicion-188.pdf");
    escribirUnida(188, edicion(188, {}, 12));
    const base = [
      "entregar",
      "edicion-del-mes-188",
      join(salida, CRUDO, "unida-188.json"),
      "--modelo",
      "sonnet",
      "--duracion-s",
      "5",
      "--hoy",
      "2026-11-16",
    ];
    // El PDF dice 68 páginas y la transcripción trae 12: falta leer (o sobra), no se entrega.
    const distinta = bandeja(...base, "--paginas", "68");
    expect(distinta.codigo).toBe(1);
    expect(distinta.texto).toContain("12 páginas y el PDF tiene 68");
    expect(existsSync(join(salida, CRUDO, "edicion-188.json"))).toBe(false);

    // Una portada que difiere de la convención del nombre se dice con --desde y --hasta.
    const ok = bandeja(
      ...base,
      "--paginas",
      "12",
      "--desde",
      "2026-11-12",
      "--hasta",
      "2026-12-12",
    );
    expect(ok.codigo).toBe(0);
    expect(ok.texto).toContain("la que dijiste de la portada");
    expect(
      JSON.parse(readFileSync(join(salida, CRUDO, "edicion-188.json"), "utf8"))
        .meta,
    ).toMatchObject({ paginas: 12, desde: "2026-11-12", hasta: "2026-12-12" });

    // Una vigencia absurda (de seis meses) no se guarda.
    rmSync(join(salida, CRUDO, "edicion-188.json"));
    const larga = bandeja(
      ...base,
      "--desde",
      "2026-11-15",
      "--hasta",
      "2027-05-15",
    );
    expect(larga.codigo).toBe(1);
    expect(larga.texto).toContain("vigencia_demasiado_larga");
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

  it("lo que no sigue el nombre de una edición no se toca, y la edición ya transcrita sale como lista, no como pendiente", () => {
    pdf("2026-10-edicion-187.pdf");
    pdf("notas.pdf");
    writeFileSync(join(salida, CRUDO, "edicion-187.json"), "{}");
    const l = bandeja("listar", "--hoy", "2026-10-20");
    expect(l.codigo).toBe(0);
    expect(l.texto).not.toContain("edicion-del-mes-187 · pendiente");
    expect(l.texto).toContain("edicion-del-mes-187 · listo");
    expect(l.texto).toContain("no siguen el nombre");
  });

  it("cargar, publicar, estado y retirar se niegan a tocar una base que no es local sin --nube, antes de leer nada", () => {
    for (const orden of [
      ["cargar", "edicion-del-mes-188"],
      ["publicar", "edicion-del-mes-188", "--revisada"],
      ["estado", "188"],
      ["retirar", "188"],
    ]) {
      const r = bandeja(...orden, "--hoy", "2026-11-16");
      expect(r.codigo, orden[0]).toBe(1);
      expect(r.texto, orden[0]).toContain("NUBE");
      expect(r.texto, orden[0]).toContain("sin --nube");
    }
  });

  it("publicar exige --revisada: la edición se publica solo con la muestra revisada", () => {
    const r = bandeja("publicar", "edicion-del-mes-188", "--hoy", "2026-11-16");
    expect(r.codigo).toBe(1);
    expect(r.texto).toContain("--revisada");
  });
});
