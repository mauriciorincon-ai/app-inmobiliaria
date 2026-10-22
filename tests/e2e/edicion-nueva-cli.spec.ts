import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { consultar } from "./utils/bd";

// S13 — «cada edición entra sin tocar código». Una edición SINTÉTICA «188» (número 9188 para no chocar con ninguna real ni
// con las de la siembra) de 12 páginas —no las 68 de la 187— y 6 proyectos ficticios pasa por la bandeja de punta a punta
// contra la base LOCAL: entregar (el archivo trae su meta) → cargar (sin publicar) → publicar con la muestra recalculada del
// archivo → retirar. Nada de esto edita `edicion.ts`. Datos 100 % sintéticos; la CLI se niega a escribir en una base que no
// sea local (y esta prueba solo corre contra la local).

const RAIZ = join(__dirname, "..", "..");
const NUMERO = 9188;
const ID = `edicion-del-mes-${NUMERO}`;
const CRUDO = "scripts/vivienda-nueva/crudo";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function bandeja(
  carpetas: { fuentes: string; salida: string },
  ...args: string[]
) {
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
        BANDEJA_FUENTES: carpetas.fuentes,
        BANDEJA_SALIDA: carpetas.salida,
        SUPABASE_URL: url,
        SUPABASE_SERVICE_ROLE_KEY: llave,
      },
    },
  );
  return { codigo: r.status, texto: `${r.stdout}${r.stderr}` };
}

const proyecto = (n: number) => ({
  nombre: `Proyecto Ficticio ${n}`,
  constructora: "Constructora Ficticia",
  tipo: "apartamento",
  ciudad: "Bogotá",
  sector: "Suba",
  segmento: "VIS",
  precio_desde: 200_000_000 + n * 10_000_000,
  area_construida_desde: 56,
  area_construida_hasta: null,
  area_privada_desde: 50,
  area_privada_hasta: null,
  etapa: "en_construccion",
  entrega: "2028-12",
  entrega_precision: "mes",
  parqueadero: "incluido",
  parqueadero_precio: null,
  precio_fijo: "si",
  subsidio_anunciado: "no_lo_dice",
  rotulos: [],
  apariciones: [n],
  region: "bogota",
  clave: `constructora ficticia|proyecto ficticio ${n}`,
  en_conflicto: [],
});

const unida = {
  edicion: NUMERO,
  // 12 páginas, no 68: el total sale del archivo.
  paginas: Array.from({ length: 12 }, (_, i) => ({
    pagina: i + 1,
    tipo: i + 1 <= 6 ? "aviso_constructora" : "articulo",
    proyectos: [],
    avisos_al_agente: [],
  })),
  proyectos: [1, 2, 3, 4, 5, 6].map(proyecto),
  conflictos: [],
  reconciliados: [],
  paginasSinLeer: [],
  paginasRepetidas: [],
};

const limpiar = () =>
  consultar(`delete from public.ediciones where numero = ${NUMERO}`);

test.describe.configure({ mode: "serial" });
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});
test.beforeAll(limpiar);
test.afterAll(limpiar);

test("una edición nueva de 12 páginas entra, se publica y se retira sin tocar código", async () => {
  const temporal = mkdtempSync(join(tmpdir(), "edicion-nueva-"));
  const fuentes = join(temporal, "fuentes");
  const salida = join(temporal, "salida");
  mkdirSync(fuentes, { recursive: true });
  mkdirSync(join(salida, CRUDO), { recursive: true });
  // El nombre del PDF fija la vigencia por convención: del 15 de noviembre al 15 de diciembre.
  writeFileSync(join(fuentes, `2026-11-edicion-${NUMERO}.pdf`), "");
  const archivo = join(salida, CRUDO, `unida-${NUMERO}.json`);
  writeFileSync(archivo, JSON.stringify(unida));
  const carpetas = { fuentes, salida };

  try {
    // 1 · entregar: la meta viaja en el archivo.
    const e = bandeja(
      carpetas,
      "entregar",
      ID,
      archivo,
      "--modelo",
      "sonnet",
      "--duracion-s",
      "1",
      "--paginas",
      "12",
      "--hoy",
      "2026-11-16",
    );
    expect(e.codigo, e.texto).toBe(0);

    // 2 · cargar: sin publicar, con lo que dijo el archivo (no `edicion.ts`).
    const c = bandeja(carpetas, "cargar", ID);
    expect(c.codigo, c.texto).toBe(0);
    expect(c.texto).toContain("Base: LOCAL");
    const fila = consultar(
      `select vigente_desde::text || '|' || vigente_hasta::text || '|' || paginas || '|' || publicada || '|' || cardinality(muestra_claves) || '|' || muestra_semilla from public.ediciones where numero = ${NUMERO}`,
    );
    // 6 proyectos ⇒ la muestra de revisión es de 5; la semilla es el número de la edición.
    expect(fila).toEqual([`2026-11-15|2026-12-15|12|false|5|${NUMERO}`]);
    expect(
      consultar(
        `select count(*) from public.proyectos_nuevos where edicion = ${NUMERO}`,
      ),
    ).toEqual(["6"]);

    // 3 · publicar: la CLI recalcula la muestra del archivo y la base la valida.
    const p = bandeja(carpetas, "publicar", ID, "--revisada");
    expect(p.codigo, p.texto).toBe(0);
    expect(
      consultar(
        `select publicada from public.ediciones where numero = ${NUMERO}`,
      ),
    ).toEqual(["t"]);

    // 4 · retirar: deja de salir de inmediato.
    const r = bandeja(carpetas, "retirar", String(NUMERO));
    expect(r.codigo, r.texto).toBe(0);
    expect(
      consultar(
        `select publicada from public.ediciones where numero = ${NUMERO}`,
      ),
    ).toEqual(["f"]);

    // Y el archivo entregado antes del S13 (sin meta) no se carga a ciegas: pide volver a entregar.
    const sinMeta = JSON.parse(
      readFileSync(join(salida, CRUDO, `edicion-${NUMERO}.json`), "utf8"),
    );
    delete sinMeta.meta;
    writeFileSync(
      join(salida, CRUDO, `edicion-${NUMERO}.json`),
      JSON.stringify(sinMeta),
    );
    const viejo = bandeja(carpetas, "cargar", ID);
    expect(viejo.codigo).toBe(1);
    expect(viejo.texto).toContain("vuelve a correr `entregar`");
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
});
