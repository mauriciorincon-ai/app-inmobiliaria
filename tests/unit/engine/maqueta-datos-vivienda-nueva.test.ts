// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { NO_LO_DICE } from "../../../src/engine/vivienda-nueva/edicion";
import type { TarifasEscrituracion } from "../../../src/engine/vivienda-nueva/escrituracion";
import type { ProyectoUnico } from "../../../src/engine/vivienda-nueva/lectura";
import {
  datosMaqueta,
  type EntradaMaqueta,
} from "../../../src/engine/vivienda-nueva/maqueta-datos";
import { precioVerdadero } from "../../../src/engine/vivienda-nueva/precio-verdadero";
import { TASA_RESPALDO } from "../../../src/engine/simulador/tasa";

// El constructor de los datos de la maqueta (S11, F2): determinista, con lista blanca de campos y con la tasa del
// simulador. Fixture sintético; al final, el archivo generado de verdad (`datos-187.js`) contra las mismas reglas.

const RAIZ = join(__dirname, "..", "..", "..");
const leer = (f: string) =>
  JSON.parse(readFileSync(join(RAIZ, "src/data", f), "utf8"));
const tarifas = leer("tarifas-escrituracion.json") as TarifasEscrituracion;
const programas = leer("subsidios-vivienda.json")
  .programas as EntradaMaqueta["programas"];

const CAMPOS = [
  "id",
  "nombre",
  "constructora",
  "tipo",
  "ciudad",
  "sector",
  "region",
  "segmento",
  "precioDesde",
  "areaConstruida",
  "areaPrivada",
  "etapa",
  "entrega",
  "entregaPrecision",
  "parqueadero",
  "parqueaderoPrecio",
  "precioFijo",
  "subsidioAnunciado",
  "rotulos",
  "paginas",
  "discrepancias",
  "precioVerdadero",
  "ficha",
  "espera",
].sort();

function pu(extra: Partial<ProyectoUnico>): ProyectoUnico {
  return {
    nombre: "Alba",
    constructora: "Constructora Uno",
    tipo: "apartamento",
    ciudad: "Bogotá",
    sector: "Suba",
    segmento: "VIS",
    precio_desde: 250_000_000,
    area_construida_desde: 56,
    area_construida_hasta: null,
    area_privada_desde: 50,
    area_privada_hasta: null,
    etapa: NO_LO_DICE,
    entrega: "2028-06",
    entrega_precision: "mes",
    parqueadero: NO_LO_DICE,
    parqueadero_precio: null,
    precio_fijo: "si",
    subsidio_anunciado: NO_LO_DICE,
    rotulos: ["otro", "lanzamiento"],
    apariciones: [4],
    region: "bogota",
    clave: "constructora uno|alba",
    ...extra,
  };
}

function entrada(): EntradaMaqueta {
  return {
    edicion: { numero: 187, desde: "2026-10-15", hasta: "2026-11-15" },
    proyectos: [
      pu({
        nombre: "Brisa",
        precio_desde: 900_000_000,
        segmento: "No VIS",
        clave: "constructora uno|brisa",
        apariciones: [9],
      }),
      pu({}),
      pu({
        nombre: "Alba",
        constructora: "Otra",
        clave: "otra|alba",
        apariciones: [11],
        entrega: NO_LO_DICE,
        entrega_precision: null,
      }),
      pu({
        nombre: "Local",
        tipo: "otro",
        clave: "constructora uno|local",
        apariciones: [12],
      }),
      pu({
        nombre: "Cerros",
        region: "sabana",
        ciudad: "Chía",
        clave: "constructora uno|cerros",
        apariciones: [20],
      }),
      pu({
        nombre: "Mar",
        region: "otra",
        ciudad: "Cartagena",
        clave: "constructora uno|mar",
        apariciones: [60],
      }),
    ],
    conflictos: [
      {
        proyecto: "constructora uno|alba",
        campo: "sector",
        valores: [
          { pagina: 4, valor: "Suba" },
          { pagina: 8, valor: "Usaquén" },
        ],
      },
    ],
    tarifas,
    programas,
    escenario: {
      fechaCorte: "2026-10-20",
      fechaSinEdicion: "2026-11-20",
      arriendo: 1_800_000,
      tasa: { tasaEA: 15.48, fechaCorte: "2026-10-09" },
      hogar: { ingresos: 8_000_000, inicial: 0.3, plazoAnos: 20 },
      hogaresSubsidio: [{ id: "hogar-4m", ingresos: 4_000_000 }],
      usados: [
        {
          zona: "bogota",
          fuente: { nombre: "ejemplo", fecha: "2026-10-20" },
          anuncios: [],
        },
      ],
    },
  };
}

describe("datosMaqueta", () => {
  const d = datosMaqueta(entrada());

  it("mismos datos, mismos bytes", () => {
    expect(JSON.stringify(datosMaqueta(entrada()))).toBe(JSON.stringify(d));
  });

  it("cada proyecto lleva solo los campos de la lista blanca (ni notas ni la clave de unión)", () => {
    for (const p of d.proyectos) expect(Object.keys(p).sort()).toEqual(CAMPOS);
  });

  it("ordena por región y nombre, con identificadores estables y únicos", () => {
    expect(d.proyectos.map((p) => p.id)).toEqual([
      "constructora-uno-alba",
      "otra-alba",
      "constructora-uno-brisa",
      "constructora-uno-local",
      "constructora-uno-cerros",
      "constructora-uno-mar",
    ]);
    expect(d.proyectos[0].rotulos).toEqual(["lanzamiento", "otro"]);
  });

  it("las discrepancias se pegan al proyecto de su clave y a ningún otro", () => {
    expect(
      d.proyectos.find((p) => p.id === "constructora-uno-alba")?.discrepancias,
    ).toEqual(["sector"]);
    expect(
      d.proyectos.find((p) => p.id === "otra-alba")?.discrepancias,
    ).toEqual([]);
  });

  it("lo que puedes pagar sale del simulador y filtra solo vivienda de Bogotá y la Sabana", () => {
    expect(d.hogar.tope).toBe(357_565_565);
    expect(d.alcanza.noCaben).toEqual(["constructora-uno-brisa"]);
    expect([...d.alcanza.caben, ...d.alcanza.noCaben]).not.toContain(
      "constructora-uno-local",
    );
    expect([...d.alcanza.caben, ...d.alcanza.noCaben]).not.toContain(
      "constructora-uno-mar",
    );
  });

  it("los destacados: el más completo con fecha de entrega, el que más calla y uno que no cabe", () => {
    expect(d.destacados).toEqual({
      completo: "constructora-uno-alba",
      faltante: "otra-alba",
      fuera: "constructora-uno-brisa",
    });
  });

  it("el índice, el subsidio y nuevo o usado vienen hechos, con las fechas de corte como dato", () => {
    expect(d.estadoEdicion.hoy.estado).toBe("vigente");
    expect(d.estadoEdicion.despues).toMatchObject({
      estado: "sin_edicion",
      dias: 5,
    });
    expect(d.subsidio[0].porProyecto.map((x) => x.id)).not.toContain(
      "constructora-uno-mar",
    );
    expect(d.nuevoOUsado[0].resultado.usados.estado).toBe("sin_datos");
    expect(d.programas.map((p) => p.id)).not.toContain("ahorro_para_mi_casa");
    expect(
      d.escrituracion.find((c) => c.id === "impuesto_registro_y_beneficencia")
        ?.estado,
    ).toBe("no_verificado");
  });
});

describe("el archivo generado (docs/diseno/vivienda-nueva/assets/datos-187.js)", () => {
  const texto = readFileSync(
    join(RAIZ, "docs/diseno/vivienda-nueva/assets/datos-187.js"),
    "utf8",
  );
  const ventana: { DATOS_187?: ReturnType<typeof datosMaqueta> } = {};
  runInNewContext(texto, { window: ventana });
  const d = ventana.DATOS_187!;

  it("es la edición 187 y usa la tasa de respaldo del simulador con su fecha", () => {
    expect(d.edicion.numero).toBe(187);
    expect(d.tasa).toEqual({
      tasaEA: TASA_RESPALDO.tasaEA,
      fechaCorte: TASA_RESPALDO.fechaCorte,
    });
  });

  it("cada proyecto lleva solo los campos de la lista blanca", () => {
    expect(d.proyectos.length).toBeGreaterThan(100);
    for (const p of d.proyectos) expect(Object.keys(p).sort()).toEqual(CAMPOS);
  });

  it("el precio verdadero publicado es el que dan HOY el motor y las tarifas (si una tarifa cambia y nadie regenera, cae)", () => {
    // Con el crudo ignorado, la CI no puede regenerar el archivo; esto ata lo publicado al motor y a `src/data`.
    let comprobados = 0;
    for (const p of d.proyectos) {
      const hoy = precioVerdadero(
        {
          precio_desde: p.precioDesde,
          segmento: p.segmento,
          ciudad: p.ciudad,
          area_privada_desde: p.areaPrivada[0],
          area_construida_desde: p.areaConstruida[0],
          parqueadero: p.parqueadero,
          parqueadero_precio: p.parqueaderoPrecio,
          precio_fijo: p.precioFijo,
          etapa: p.etapa,
          en_conflicto: p.discrepancias,
        },
        tarifas,
      );
      expect(p.precioVerdadero, p.id).toEqual(JSON.parse(JSON.stringify(hoy)));
      comprobados++;
    }
    expect(comprobados).toBe(d.proyectos.length);
  });
});
