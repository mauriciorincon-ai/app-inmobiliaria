// Genera los datos de la maqueta de vivienda nueva (S11, F2): docs/diseno/vivienda-nueva/assets/datos-187.js.
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/vivienda-nueva/maqueta.mjs              → escribe
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/vivienda-nueva/maqueta.mjs --comprobar  → regenera y
//        compara byte a byte con lo escrito (sale 1 si difiere)
// Vuelve a validar y unir las lecturas de `crudo/` en memoria, aplica el escenario de ejemplo y pasa por la lista blanca de
// `datosMaqueta`. Mismos datos ⇒ mismos bytes. El escenario (hogar, arriendo, usados) es DE EJEMPLO y la maqueta lo dice.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EDICION,
  PAGINAS_EDICION,
  validarLectura,
} from "../../src/engine/vivienda-nueva/edicion.ts";
import { unirLecturas } from "../../src/engine/vivienda-nueva/lectura.ts";
import { datosMaqueta } from "../../src/engine/vivienda-nueva/maqueta-datos.ts";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..");
const CRUDO = join(AQUI, "crudo");
const SALIDA = join(RAIZ, "docs/diseno/vivienda-nueva/assets/datos-187.js");

// La tasa de respaldo del simulador (src/engine/simulador/tasa.ts, TASA_RESPALDO), con su fecha. Una prueba exige que
// coincidan: aquí no se puede importar porque ese módulo carga un JSON.
const TASA = { tasaEA: 15.48, fechaCorte: "2026-10-09" };

const FUENTE_EJEMPLO = { nombre: "ejemplo", fecha: "2026-10-20" };
const ESCENARIO = {
  fechaCorte: "2026-10-20",
  fechaSinEdicion: "2026-11-20",
  arriendo: 1_800_000,
  tasa: TASA,
  hogar: { ingresos: 8_000_000, inicial: 0.3, plazoAnos: 20 },
  hogaresSubsidio: [
    { id: "hogar-4m", ingresos: 4_000_000 },
    { id: "hogar-6m", ingresos: 6_000_000 },
    { id: "hogar-8m", ingresos: 8_000_000 },
  ],
  usados: [
    {
      zona: "bogota",
      fuente: FUENTE_EJEMPLO,
      anuncios: [
        [45, 300_000_000],
        [42, 270_000_000],
        [50, 330_000_000],
        [48, 310_000_000],
        [40, 250_000_000],
        [44, 290_000_000],
        [52, 350_000_000],
        [43, 280_000_000],
      ].map(([area_m2, precio_esperado]) => ({ area_m2, precio_esperado })),
    },
    {
      zona: "sabana",
      fuente: FUENTE_EJEMPLO,
      anuncios: [
        [60, 240_000_000],
        [70, 300_000_000],
        [55, 230_000_000],
      ].map(([area_m2, precio_esperado]) => ({ area_m2, precio_esperado })),
    },
  ],
};

function construir() {
  const lecturas = readdirSync(CRUDO)
    .filter((f) => /^lectura-L[A-Za-z0-9_-]*\.json$/.test(f))
    .sort()
    .map((f) => {
      const r = validarLectura(
        JSON.parse(readFileSync(join(CRUDO, f), "utf8")),
      );
      if (!r.ok) throw new Error(`${f} no pasa el esquema: ${r.errores[0]}`);
      return r.lectura;
    });
  const unida = unirLecturas(lecturas, PAGINAS_EDICION);
  if (unida.paginasSinLeer.length > 0) {
    throw new Error(`faltan páginas: ${unida.paginasSinLeer.join(", ")}`);
  }
  const leer = (f) =>
    JSON.parse(readFileSync(join(RAIZ, "src/data", f), "utf8"));
  const datos = datosMaqueta({
    edicion: {
      numero: EDICION.numero,
      desde: EDICION.desde,
      hasta: EDICION.hasta,
    },
    proyectos: unida.proyectos,
    conflictos: unida.conflictos,
    tarifas: leer("tarifas-escrituracion.json"),
    programas: leer("subsidios-vivienda.json").programas,
    escenario: ESCENARIO,
  });
  return (
    "/* Generado por scripts/vivienda-nueva/maqueta.mjs: no se edita a mano. Fuente: Estrenar Vivienda, edición 187\n" +
    "   (procesada: sin fotos, logos, textos de avisos, teléfonos, direcciones ni webs). Hogar, arriendo y usados: de ejemplo. */\n" +
    `window.DATOS_187 = ${JSON.stringify(datos, null, 1)};\n`
  );
}

const texto = construir();
if (process.argv.includes("--comprobar")) {
  const actual = readFileSync(SALIDA, "utf8");
  if (actual !== texto) {
    console.error(
      "✗ datos-187.js difiere de lo que generan los datos actuales",
    );
    process.exit(1);
  }
  console.log(
    `✓ datos-187.js: mismos bytes (${Buffer.byteLength(texto)} bytes)`,
  );
} else {
  writeFileSync(SALIDA, texto);
  console.log(
    `Escrito ${SALIDA.replace(RAIZ + "/", "")} (${Buffer.byteLength(texto)} bytes)`,
  );
}
