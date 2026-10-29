// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FuentePrecio } from "../../../src/engine/precio/comparables";
import { precioMaximo } from "../../../src/engine/simulador/cuota";
import { NO_LO_DICE } from "../../../src/engine/vivienda-nueva/edicion";
import {
  topeVis,
  type TarifasEscrituracion,
} from "../../../src/engine/vivienda-nueva/escrituracion";
import type { ProyectoUnico } from "../../../src/engine/vivienda-nueva/lectura";
import type { Subsidios } from "../../../src/engine/vivienda-nueva/normas";
import {
  nuevoOUsado,
  type UsadoParaComparar,
} from "../../../src/engine/vivienda-nueva/nuevo-o-usado";
import { precioVerdadero } from "../../../src/engine/vivienda-nueva/precio-verdadero";
import {
  mejorCaso,
  subsidiosPara,
  type Programa,
} from "../../../src/engine/vivienda-nueva/subsidio";
import {
  HOGARES_EJEMPLO,
  INICIAL_EJEMPLO,
  PLAZO_EJEMPLO,
  teAlcanza,
  type ProyectoSubsidio,
} from "../../../src/engine/vivienda-nueva/te-alcanza";
import {
  edicionVigente,
  leerFiltrosComparar,
  paramsComparar,
  vistaLista,
  vistaNuevoOUsado,
  vistaProyecto,
  vistaTeAlcanza,
  vistaVisitaSala,
  type EdicionPublicada,
  type ProyectoPublicado,
  type VistaNuevoOUsado,
} from "../../../src/engine/vivienda-nueva/vista";
import { edicion187 } from "../utils/edicion-187";

// Las comparaciones de la vivienda nueva (S13, F2): «¿Nuevo o usado?», «¿Te alcanza con subsidio?» y si se puede pedir la
// visita a la sala. Cada cifra sale de un motor: las pruebas atan lo que el servidor entrega al motor llamado directo y, con
// la 187 real, a la maqueta aprobada. Datos sintéticos para las ramas; ningún ingreso real (los tres hogares son de ejemplo).

const RAIZ = join(__dirname, "..", "..", "..");
const leer = <T>(f: string) =>
  JSON.parse(readFileSync(join(RAIZ, f), "utf8")) as T;
const tarifas = leer<TarifasEscrituracion>(
  "src/data/tarifas-escrituracion.json",
);
const subsidios = leer<Subsidios>("src/data/subsidios-vivienda.json");
const TASA = { tasaEA: 15.48, fechaCorte: "2026-10-09" };
const FUENTE: FuentePrecio = {
  nombre: "anuncios de prueba",
  fecha: "2026-10-24",
};
const HOY = "2026-10-24";

function pp(
  slug: string,
  extra: Partial<ProyectoUnico> = {},
): ProyectoPublicado {
  return {
    slug,
    nombre: `Proyecto ${slug}`,
    constructora: "Constructora de Prueba",
    tipo: "apartamento",
    ciudad: "Bogotá",
    sector: "Suba",
    segmento: "VIS",
    precio_desde: 250_000_000,
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
    subsidio_anunciado: NO_LO_DICE,
    rotulos: [],
    apariciones: [4],
    region: "bogota",
    clave: `c|${slug}`,
    en_conflicto: [],
    ...extra,
  } as ProyectoPublicado;
}

/** `n` usados de 50 m² entre $250 y $250 + (n−1)·5 M: un m² de unos $5 M. */
const usados = (n: number): UsadoParaComparar[] =>
  Array.from({ length: n }, (_, i) => ({
    area_m2: 50,
    precio_esperado: 250_000_000 + i * 5_000_000,
  }));

describe("¿Nuevo o usado?: los filtros de la URL", () => {
  it("Bogotá por omisión; la Sabana si se pide; una zona que no se entiende es Bogotá", () => {
    expect(leerFiltrosComparar({})).toEqual({ zona: "bogota", pago: false });
    expect(leerFiltrosComparar({ zona: "sabana" }).zona).toBe("sabana");
    expect(leerFiltrosComparar({ zona: "medellin" }).zona).toBe("bogota");
    expect(leerFiltrosComparar({ zona: ["sabana", "bogota"] }).zona).toBe(
      "sabana",
    );
  });

  it("el presupuesto es el mismo `max` de «Nuevos» (con su techo); `pago` solo con presupuesto", () => {
    expect(leerFiltrosComparar({ max: "300000000", pago: "1" })).toEqual({
      zona: "bogota",
      max: 300_000_000,
      pago: true,
    });
    expect(leerFiltrosComparar({ max: "0" }).max).toBeUndefined();
    expect(leerFiltrosComparar({ max: "abc", pago: "1" })).toEqual({
      zona: "bogota",
      pago: false,
    });
  });

  it("ida y vuelta por la URL", () => {
    for (const f of [
      { zona: "sabana" as const, pago: false },
      { zona: "bogota" as const, max: 420_000_000, pago: true },
      { zona: "bogota" as const, max: 420_000_000, pago: false },
    ]) {
      const p = paramsComparar(f);
      expect(leerFiltrosComparar(Object.fromEntries(p))).toEqual(f);
    }
    expect(paramsComparar({ zona: "sabana", pago: false }).toString()).toBe(
      "zona=sabana",
    );
  });
});

/** El gate del 03: jamás una comparación con menos de 5 usados, y jamás una diferencia sin los dos lados. */
function problemasComparacion(v: VistaNuevoOUsado): string[] {
  const r = v.resultado;
  if (!r) return [];
  const p: string[] = [];
  if (r.usados.estado === "con_datos" && r.usados.n < 5) {
    p.push(`compara con ${r.usados.n} usados`);
  }
  if (
    r.diferencia !== null &&
    (r.usados.estado !== "con_datos" || r.nuevos.medianaM2 === null)
  ) {
    p.push("da una diferencia sin los dos lados");
  }
  return p;
}

describe("¿Nuevo o usado?: la vista", () => {
  const nuevos = [
    pp("a", { precio_desde: 230_000_000 }),
    pp("b", { precio_desde: 240_000_000 }),
    pp("c", { precio_desde: 250_000_000 }),
    pp("d", { precio_desde: 260_000_000 }),
    pp("e", { precio_desde: 270_000_000 }),
    pp("caro", { precio_desde: 900_000_000 }),
    pp("casa", { tipo: "casa" }),
    pp("funza", { region: "sabana", ciudad: "Funza" }),
    pp("sin-precio", { precio_desde: NO_LO_DICE }),
  ];

  it("sin presupuesto: no hay «lo que cabe», pero sí cuántos apartamentos hay en la zona (ni casas ni otra zona)", () => {
    const v = vistaNuevoOUsado(
      nuevos,
      usados(8),
      tarifas,
      { zona: "bogota", pago: false },
      FUENTE,
      HOY,
    );
    expect(v).toEqual({
      zona: "bogota",
      total: 7,
      usadosDisponibles: true,
      presupuesto: null,
      resultado: null,
      caben: [],
    });
  });

  it("DEMO EN ROJO del gate de los 5 usados: con 4 dice «sin datos» y no compara; con 5 compara", () => {
    const con = (n: number) =>
      vistaNuevoOUsado(
        nuevos,
        usados(n),
        tarifas,
        { zona: "bogota", max: 400_000_000, pago: false },
        FUENTE,
        HOY,
      );
    const cuatro = con(4);
    expect(cuatro.resultado!.usados).toEqual({
      estado: "sin_datos",
      n: 4,
      minimo: 5,
      fuente: FUENTE,
    });
    expect(cuatro.resultado!.diferencia).toBeNull();
    expect(problemasComparacion(cuatro)).toEqual([]);

    const cinco = con(5);
    expect(cinco.resultado!.usados.estado).toBe("con_datos");
    expect(cinco.resultado!.diferencia).not.toBeNull();
    expect(problemasComparacion(cinco)).toEqual([]);

    // El gate cae si alguien compara con 4 o inventa una diferencia sin los dos lados.
    const trampa: VistaNuevoOUsado = {
      ...cuatro,
      resultado: {
        ...cuatro.resultado!,
        usados: {
          estado: "con_datos",
          n: 4,
          medianaM2: 5_000_000,
          p25M2: 4_900_000,
          p75M2: 5_100_000,
          fuente: FUENTE,
        },
      },
    };
    expect(problemasComparacion(trampa)).toEqual(["compara con 4 usados"]);
    expect(
      problemasComparacion({
        ...cuatro,
        resultado: { ...cuatro.resultado!, diferencia: 12 },
      }),
    ).toEqual(["da una diferencia sin los dos lados"]);
  });

  it("lo nuevo que cabe va por su precio VERDADERO, del más barato al más caro, con su tarjeta y su espera del motor", () => {
    const v = vistaNuevoOUsado(
      nuevos,
      usados(8),
      tarifas,
      { zona: "bogota", max: 400_000_000, pago: true },
      FUENTE,
      HOY,
    );
    expect(v.caben.map((c) => c.tarjeta.slug)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
    expect(v.resultado!.nuevos.caben).toEqual(["a", "b", "c", "d", "e"]);
    for (const c of v.caben) {
      const p = nuevos.find((x) => x.slug === c.tarjeta.slug)!;
      const pv = precioVerdadero(p, tarifas);
      expect(c.tarjeta.precio).toMatchObject({
        estado: "calculado",
        alMenos: pv.estado === "calculado" ? pv.alMenos : -1,
      });
      expect(c.espera).toEqual(
        vistaProyecto(nuevos, p.slug, tarifas, HOY)!.espera,
      );
    }
    expect(v.resultado!.nuevos.medianaM2).not.toBeNull();
  });

  it("los usados por encima del presupuesto no cuentan", () => {
    const v = vistaNuevoOUsado(
      nuevos,
      [
        ...usados(4),
        ...usados(5).map((u) => ({ ...u, precio_esperado: 999_000_000 })),
      ],
      tarifas,
      { zona: "bogota", max: 400_000_000, pago: false },
      FUENTE,
      HOY,
    );
    expect(v.resultado!.usados).toMatchObject({ estado: "sin_datos", n: 4 });
  });

  it("un precio en conflicto no cabe; un área en conflicto o solo construida no entra al m²", () => {
    const base = [
      pp("p1", { precio_desde: 230_000_000 }),
      pp("p2", { precio_desde: 231_000_000 }),
      pp("p3", { precio_desde: 232_000_000 }),
      pp("p4", { precio_desde: 233_000_000 }),
      pp("area-conflicto", {
        precio_desde: 234_000_000,
        en_conflicto: ["area_privada_desde"],
      }),
      pp("solo-construida", {
        precio_desde: 235_000_000,
        area_privada_desde: NO_LO_DICE,
      }),
      pp("precio-conflicto", {
        precio_desde: 236_000_000,
        en_conflicto: ["precio_desde"],
      }),
    ];
    const v = vistaNuevoOUsado(
      base,
      usados(8),
      tarifas,
      { zona: "bogota", max: 400_000_000, pago: false },
      FUENTE,
      HOY,
    );
    expect(v.resultado!.nuevos.caben).not.toContain("precio-conflicto");
    expect(v.resultado!.nuevos.n).toBe(6);
    // Solo 4 con m² privado limpio: sin mediana, y por eso sin diferencia.
    expect(v.resultado!.nuevos.medianaM2).toBeNull();
    expect(v.resultado!.diferencia).toBeNull();
  });

  it("en la Sabana no hay usados de Innmobiliaria (fase 1 = Bogotá): «sin datos» con 0, aunque la base mande alguno", () => {
    const v = vistaNuevoOUsado(
      nuevos,
      usados(8),
      tarifas,
      { zona: "sabana", max: 400_000_000, pago: false },
      FUENTE,
      HOY,
    );
    expect(v.total).toBe(1);
    expect(v.resultado!.usados).toMatchObject({ estado: "sin_datos", n: 0 });
    expect(
      vistaNuevoOUsado(
        nuevos,
        null,
        tarifas,
        { zona: "sabana", max: 400_000_000, pago: false },
        FUENTE,
        HOY,
      ).usadosDisponibles,
    ).toBe(true);
  });

  it("si la base no respondió en Bogotá, la vista lo dice (no «0 usados»)", () => {
    const v = vistaNuevoOUsado(
      nuevos,
      null,
      tarifas,
      { zona: "bogota", max: 400_000_000, pago: false },
      FUENTE,
      HOY,
    );
    expect(v.usadosDisponibles).toBe(false);
    expect(v.resultado!.usados).toMatchObject({ estado: "sin_datos", n: 0 });
  });
});

// --- ¿Te alcanza con subsidio? ------------------------------------------------------------------------------------------
const programa = (id: string, extra: Partial<Programa> = {}): Programa => ({
  id,
  ambito: "nacional",
  destino: "compra",
  estado: "vigente",
  ingreso_maximo_pesos_2026: null,
  monto: { pesos_2026: { minimo: null, maximo: 30_000_000 } },
  ...extra,
});

const ps = (
  slug: string,
  alMenos: number,
  extra: Partial<ProyectoSubsidio> = {},
): ProyectoSubsidio => ({
  slug,
  nombre: `Proyecto ${slug}`,
  segmento: "VIS",
  // Por debajo del tope VIS de Bogotá: el segmento decide, no el precio.
  precio_desde: 200_000_000,
  region: "bogota",
  topeVis: topeVis("Bogotá", tarifas),
  alMenos,
  ...extra,
});

describe("¿Te alcanza?: el motor de un hogar", () => {
  const hogar = {
    ingresos: 6_000_000,
    inicial: 0.3,
    plazoAnos: 20,
    tasaEA: 15.48,
  };
  const tope = precioMaximo(6_000_000, 0.3, 20, 15.48)!;

  it("dos programas de compra que aplican NUNCA se suman: cabe con el mayor o no cabe", () => {
    const programas = [
      programa("grande", {
        monto: { pesos_2026: { minimo: null, maximo: 30_000_000 } },
      }),
      programa("chico", {
        monto: { pesos_2026: { minimo: null, maximo: 20_000_000 } },
      }),
    ];
    // Con la suma (50 M) cabría; con el mayor (30 M), no.
    const justo = ps("justo", tope + 40_000_000);
    const r = teAlcanza(hogar, [justo], programas);
    expect(r.porProyecto[0].mejor).toEqual({ id: "grande", monto: 30_000_000 });
    expect(r.porProyecto[0].cabeConSubsidio).toBe(false);
    expect(r.conSubsidio).toBe(0);
    // Con el mayor sí: cabe por 30 M, no por 50 M.
    const r2 = teAlcanza(hogar, [ps("cabe", tope + 30_000_000)], programas);
    expect(r2.porProyecto[0].cabeConSubsidio).toBe(true);
    expect(r2.porProyecto[0].cabeSinSubsidio).toBe(false);
  });

  it("«sin cupos» se dice y no suma; el de la cuota no baja el precio; lo no verificado no entra", () => {
    const r = teAlcanza(
      hogar,
      [ps("x", tope + 10_000_000)],
      [
        programa("sin-cupos", { estado: "sin_cupos" }),
        programa("cuota", { destino: "cuota" }),
        programa("sin-verificar", { estado: "no_verificado" }),
      ],
    );
    const p = r.porProyecto[0];
    expect(p.resultados.map((x) => [x.id, x.estado])).toEqual([
      ["sin-cupos", "sin_cupos"],
      ["cuota", "aplica"],
    ]);
    expect(p.mejor).toBeNull();
    expect(p.cabeConSubsidio).toBe(false);
  });

  it("lo que está por confirmar (proyecto inscrito, segmento que el aviso no dice) también es el mejor caso, y se dice", () => {
    const r = teAlcanza(
      hogar,
      [ps("x", tope + 10_000_000, { segmento: NO_LO_DICE })],
      [programa("oferta_preferente", { ambito: "bogota" })],
    );
    expect(r.porProyecto[0].resultados[0]).toEqual({
      id: "oferta_preferente",
      estado: "por_confirmar",
      motivos: ["segmento_no_lo_dice", "proyecto_inscrito"],
    });
    expect(r.porProyecto[0].cabeConSubsidio).toBe(true);
  });

  it("sin tasa no hay tope: nada «cabe» (el simulador no inventa)", () => {
    const r = teAlcanza(
      { ...hogar, tasaEA: 0 },
      [ps("x", 100_000_000)],
      [programa("p")],
    );
    expect(r.tope).toBeNull();
    expect(r.porProyecto[0]).toMatchObject({
      cabeSinSubsidio: false,
      cabeConSubsidio: false,
    });
    expect([r.sinSubsidio, r.conSubsidio]).toEqual([0, 0]);
  });
});

describe("¿Te alcanza?: la vista del servidor", () => {
  const proyectos = [
    pp("social-caro", { precio_desde: 255_000_000 }),
    pp("social", { precio_desde: 200_000_000 }),
    pp("no-vis", { segmento: "No VIS", precio_desde: 150_000_000 }),
    pp("funza", {
      region: "sabana",
      ciudad: "Funza",
      precio_desde: 190_000_000,
    }),
    pp("medellin", { region: "otra", ciudad: "Medellín" }),
    pp("lote", { tipo: "lote" }),
    pp("sin-precio", { precio_desde: NO_LO_DICE }),
  ];
  const v = vistaTeAlcanza(proyectos, subsidios, tarifas, TASA);

  it("solo vivienda de Bogotá y la Sabana con precio verdadero, del «al menos» más bajo al más alto", () => {
    expect(v.motor.proyectos.map((p) => p.slug)).toEqual([
      "no-vis",
      "funza",
      "social",
      "social-caro",
    ]);
    for (const p of v.motor.proyectos) {
      const pv = precioVerdadero(
        proyectos.find((x) => x.slug === p.slug)!,
        tarifas,
      );
      expect(p.alMenos).toBe(pv.estado === "calculado" ? pv.alMenos : -1);
      expect(p.topeVis).toBe(
        topeVis(p.region === "bogota" ? "Bogotá" : "Funza", tarifas),
      );
    }
  });

  it("la salvedad de cada programa llega a la tabla, en los dos idiomas (S16)", () => {
    const cuota = v.programas.find((p) => p.id === "reduce_tu_cuota");
    expect(cuota?.nota?.es).toMatch(/agotar cupos/);
    expect(cuota?.nota?.en.length).toBeGreaterThan(0);
  });

  it("cada programa que se muestra trae su norma, su año, su estado con fecha y la fecha en que se consultó; ni arriendo ni lo no verificado", () => {
    const fecha = /^\d{4}-\d{2}-\d{2}$/;
    expect(v.programas.length).toBeGreaterThan(0);
    for (const p of v.programas) {
      expect(p.normas.length, p.id).toBeGreaterThan(0);
      expect(p.anio, p.id).toBe(subsidios.vigencia);
      expect(p.estadoAl, p.id).toMatch(fecha);
      expect(p.consultado, p.id).toMatch(fecha);
      expect(["vigente", "sin_cupos", "suspendido"]).toContain(p.estado);
      expect(p.destino).not.toBe("arriendo");
    }
    // El nacional sin cupos se DICE (sale con su estado), pero no suma (lo prueba el motor).
    expect(
      v.programas.find((p) => p.id === "subsidio_vivienda_nueva_nacional")
        ?.estado,
    ).toBe("sin_cupos");
    expect(v.programas.map((p) => p.id)).not.toContain("ahorro_para_mi_casa");
  });

  it("lo no verificado no aparece: solo su NOMBRE en «lo que no mostramos», jamás en programas, resultados ni mejor caso", () => {
    const conUnoSinVerificar: Subsidios = {
      ...subsidios,
      programas: subsidios.programas.map((p) =>
        p.id === "oferta_preferente" ? { ...p, estado: "no_verificado" } : p,
      ),
    };
    const w = vistaTeAlcanza(proyectos, conUnoSinVerificar, tarifas, TASA);
    const prohibidos = new Set([
      "oferta_preferente",
      ...subsidios.no_verificados.map((p) => p.id),
    ]);
    expect(w.noMostrados).toEqual([
      conUnoSinVerificar.programas.find((p) => p.id === "oferta_preferente")!
        .nombre,
      ...subsidios.no_verificados.map((p) => p.nombre),
    ]);
    const ids = [
      ...w.programas.map((p) => p.id),
      ...w.motor.programas.map((p) => p.id),
      ...w.hogares.flatMap((h) =>
        h.porProyecto.flatMap((x) => [
          ...x.resultados.map((r) => r.id),
          x.mejor?.id,
        ]),
      ),
    ];
    expect(ids.filter((id) => id !== undefined && prohibidos.has(id))).toEqual(
      [],
    );
    // Y ningún monto suyo viaja: los nombres son lo único.
    for (const n of w.noMostrados)
      expect(Object.keys(n).sort()).toEqual(["en", "es"]);
  });

  it("los tres hogares de ejemplo son los de la maqueta y cada uno es `teAlcanza` llamado directo", () => {
    expect(v.hogares.map((h) => h.ingresos)).toEqual([...HOGARES_EJEMPLO]);
    for (const h of v.hogares) {
      expect(h).toEqual(
        teAlcanza(
          {
            ingresos: h.ingresos,
            inicial: INICIAL_EJEMPLO,
            plazoAnos: PLAZO_EJEMPLO,
            tasaEA: TASA.tasaEA,
          },
          v.motor.proyectos,
          v.motor.programas,
        ),
      );
    }
  });

  it("la isla del teléfono corre EL MISMO motor: con los datos de `motor` y el mismo ingreso, el mismo resultado", () => {
    const delTelefono = teAlcanza(
      {
        ingresos: 6_000_000,
        inicial: 0.3,
        plazoAnos: 20,
        tasaEA: v.motor.tasaEA,
      },
      v.motor.proyectos,
      v.motor.programas,
    );
    expect(delTelefono).toEqual(v.hogares[1]);
    // El motor del teléfono no necesita lo que la pantalla enseña (notas, fuentes): solo cifras y estados.
    for (const p of v.motor.programas) {
      expect(Object.keys(p).sort()).toEqual([
        "ambito",
        "destino",
        "estado",
        "id",
        "ingreso_maximo_pesos_2026",
        "monto",
      ]);
    }
  });

  it("el proyecto con que se explican los programas: el VIS o VIP de Bogotá con el «al menos» más bajo", () => {
    expect(v.ejemplo?.slug).toBe("social");
    const sinSocial = vistaTeAlcanza(
      [
        pp("nv", { segmento: "No VIS", precio_desde: 300_000_000 }),
        pp("fz", { region: "sabana", ciudad: "Funza" }),
      ],
      subsidios,
      tarifas,
      TASA,
    );
    expect(sinSocial.ejemplo?.slug).toBe("nv");
    expect(
      vistaTeAlcanza(
        [pp("fz", { region: "sabana", ciudad: "Funza" })],
        subsidios,
        tarifas,
        TASA,
      ).ejemplo?.slug,
    ).toBe("fz");
    expect(vistaTeAlcanza([], subsidios, tarifas, TASA).ejemplo).toBeNull();
  });

  it("la tasa con su fecha llega a la pantalla", () => {
    expect(v.tasa).toEqual(TASA);
    expect(v.motor.tasaEA).toBe(TASA.tasaEA);
  });
});

describe("la visita a la sala: solo con la edición vigente (la misma regla que la base)", () => {
  const ed: EdicionPublicada = {
    numero: 9001,
    nombre: "Edición Ficticia",
    desde: "2026-10-15",
    hasta: "2026-11-15",
    paginas: 12,
  };
  const proyectos = [pp("torre", { apariciones: [3, 7] })];

  it("vigente: se puede pedir, con las páginas de la revista", () => {
    expect(
      vistaVisitaSala(proyectos, edicionVigente([ed], "2026-10-24"), "torre"),
    ).toEqual({
      estado: "pedir",
      edicion: ed,
      proyecto: {
        slug: "torre",
        nombre: "Proyecto torre",
        constructora: "Constructora de Prueba",
        ciudad: "Bogotá",
        sector: "Suba",
        region: "bogota",
        paginas: [3, 7],
      },
    });
  });

  it("mes sin edición: se dice, con cuántos días hace que venció, y no se ofrece", () => {
    const v = vistaVisitaSala(
      proyectos,
      edicionVigente([ed], "2026-11-20"),
      "torre",
    );
    expect(v).toMatchObject({
      estado: "sin_edicion",
      vencida: "2026-11-15",
      dias: 5,
    });
  });

  it("sin edición publicada o con un proyecto que no está: null", () => {
    expect(
      vistaVisitaSala(proyectos, { estado: "sin_publicar" }, "torre"),
    ).toBeNull();
    expect(
      vistaVisitaSala(proyectos, edicionVigente([ed], "2026-10-24"), "otra"),
    ).toBeNull();
  });
});

describe("lo publicado = el motor y la maqueta aprobada (la edición 187 real)", () => {
  const { d, unidos, publicados } = edicion187();
  const idDe = new Map(publicados.map((p, i) => [p.slug, d.proyectos[i].id]));

  it("«¿Nuevo o usado?» es `nuevoOUsado` llamado directo con los apartamentos de la zona", () => {
    const lista = [
      ...usados(12),
      ...usados(30).map((u) => ({ ...u, area_m2: 62 })),
    ];
    for (const zona of ["bogota", "sabana"] as const) {
      for (const max of [250_000_000, 400_000_000, 900_000_000]) {
        const v = vistaNuevoOUsado(
          publicados,
          lista,
          tarifas,
          { zona, max, pago: false },
          FUENTE,
          d.fechaCorte,
        );
        const directo = nuevoOUsado(
          max,
          unidos
            .map((p, i) => ({ p, slug: publicados[i].slug }))
            .filter(({ p }) => p.region === zona && p.tipo === "apartamento")
            .sort((a, b) => (a.slug < b.slug ? -1 : 1))
            .map(({ p, slug }) => {
              const pv = precioVerdadero(p, tarifas);
              return {
                id: slug,
                alMenos: pv.estado === "calculado" ? pv.alMenos : null,
                m2Privado: pv.m2.base === "privada" ? pv.m2.valor : null,
              };
            }),
          zona === "bogota" ? lista : [],
          FUENTE,
        );
        expect(v.resultado, `${zona} ${max}`).toEqual(directo);
        expect(problemasComparacion(v)).toEqual([]);
      }
    }
  });

  it("«¿Te alcanza?» con la tasa de la maqueta da los mismos tres hogares que la maqueta aprobada, proyecto por proyecto", () => {
    const v = vistaTeAlcanza(publicados, subsidios, tarifas, d.tasa);
    expect(d.subsidio.map((h) => h.ingresos)).toEqual([...HOGARES_EJEMPLO]);
    expect([d.hogar.inicial, d.hogar.plazoAnos]).toEqual([
      INICIAL_EJEMPLO,
      PLAZO_EJEMPLO,
    ]);
    for (let i = 0; i < 3; i++) {
      const m = d.subsidio[i];
      const h = v.hogares[i];
      expect(h.tope).toBe(m.tope);
      const deVista = new Map(h.porProyecto.map((x) => [idDe.get(x.slug), x]));
      expect([...deVista.keys()].sort()).toEqual(
        m.porProyecto.map((x) => x.id).sort(),
      );
      for (const x of m.porProyecto) {
        // Mismo contenido; solo cambia la llave (el slug de la base, el id de la maqueta).
        expect({ ...deVista.get(x.id)!, slug: undefined }, x.id).toEqual({
          ...x,
          id: undefined,
        });
      }
    }
  });

  it("y cada proyecto de cada hogar es `subsidiosPara` + `mejorCaso` llamados directo", () => {
    const v = vistaTeAlcanza(publicados, subsidios, tarifas, TASA);
    const porSlug = new Map(publicados.map((p, i) => [p.slug, unidos[i]]));
    for (const h of v.hogares) {
      for (const x of h.porProyecto) {
        const p = porSlug.get(x.slug)!;
        const directo = subsidiosPara(
          h.ingresos,
          {
            segmento: p.segmento,
            precio_desde: p.precio_desde,
            region: p.region,
          },
          subsidios.programas,
          topeVis(String(p.ciudad), tarifas),
        );
        expect(x.resultados).toEqual(
          directo.map(({ id, estado, motivos }) => ({ id, estado, motivos })),
        );
        expect(x.mejor).toEqual(mejorCaso(directo));
      }
    }
  });

  it("el hogar de $8 M pasa el tope de ingresos de los programas de Bogotá (el estado que diseñó la maqueta)", () => {
    const v = vistaTeAlcanza(publicados, subsidios, tarifas, TASA);
    const ocho = v.hogares[2];
    const deBogota = new Set(
      v.programas.filter((p) => p.ambito === "bogota").map((p) => p.id),
    );
    for (const x of ocho.porProyecto) {
      for (const r of x.resultados.filter((r) => deBogota.has(r.id))) {
        expect(r.estado, `${x.slug} ${r.id}`).toBe("no_aplica");
        expect(r.motivos).toContain("ingreso");
      }
    }
  });

  it("el cálculo de las páginas nuevas cabe en el Worker (143 proyectos y 2.000 usados), medido", () => {
    const mediana = (fn: () => void) => {
      const veces: number[] = [];
      for (let r = 0; r < 25; r++) {
        const t0 = performance.now();
        fn();
        veces.push(performance.now() - t0);
      }
      return veces.sort((x, y) => x - y)[12];
    };
    const dosMil = Array.from({ length: 2000 }, (_, i) => ({
      area_m2: 40 + (i % 60),
      precio_esperado: 150_000_000 + i * 250_000,
    }));
    const comparar = mediana(() => {
      vistaNuevoOUsado(
        publicados,
        dosMil,
        tarifas,
        { zona: "bogota", max: 400_000_000, pago: false },
        FUENTE,
        d.fechaCorte,
      );
    });
    const alcanza = mediana(() => {
      vistaTeAlcanza(publicados, subsidios, tarifas, TASA);
    });
    const lista = mediana(() => {
      vistaLista(publicados, tarifas, { pago: false });
    });
    // La cifra va al cierre (`--reporter=verbose` la muestra); el Worker gratis da 10 ms de CPU por petición.
    console.info(
      `S13 (143 proyectos): ¿nuevo o usado? con 2.000 usados = ${comparar.toFixed(2)} ms · ¿te alcanza? (3 hogares) = ${alcanza.toFixed(2)} ms · lista S12 = ${lista.toFixed(2)} ms (medianas de 25)`,
    );
    expect(comparar).toBeLessThan(50);
    expect(alcanza).toBeLessThan(50);
  });
});

describe("la isla del teléfono no carga zod", () => {
  // `teAlcanza` corre en el navegador (pantalla 04): zod le sumaría ~48 KB de script (S10). Se recorren los `import` que
  // quedan en el bundle (los `import type` se borran al compilar) desde `te-alcanza.ts`.
  function grafo(archivo: string, vistos = new Set<string>()): Set<string> {
    if (vistos.has(archivo)) return vistos;
    vistos.add(archivo);
    const texto = readFileSync(archivo, "utf8");
    for (const m of texto.matchAll(
      /^import\s+(?!type\b)[^;]*?from\s+"([^"]+)";/gm,
    )) {
      const destino = m[1];
      if (destino.startsWith("."))
        grafo(resolve(dirname(archivo), destino), vistos);
      else vistos.add(destino);
    }
    return vistos;
  }

  it("ni `te-alcanza.ts` ni lo que importa de verdad traen zod (ni la tasa del S10, que lo usa)", () => {
    const g = [...grafo(join(RAIZ, "src/engine/vivienda-nueva/te-alcanza.ts"))];
    expect(g.some((x) => x === "zod" || x.startsWith("zod/"))).toBe(false);
    expect(g.map((x) => x.replace(RAIZ + "/", "")).sort()).toEqual([
      "src/engine/simulador/cuota.ts",
      "src/engine/vivienda-nueva/subsidio.ts",
      "src/engine/vivienda-nueva/te-alcanza.ts",
    ]);
  });

  it("DEMO EN ROJO: el mismo recorrido sí encuentra zod en `tasa.ts`", () => {
    expect(grafo(join(RAIZ, "src/engine/simulador/tasa.ts")).has("zod")).toBe(
      true,
    );
  });
});
