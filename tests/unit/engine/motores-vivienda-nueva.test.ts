// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NO_LO_DICE,
  ILEGIBLE,
} from "../../../src/engine/vivienda-nueva/edicion";
import {
  derechosNotariales,
  derechosRegistro,
  topeVis,
  type TarifasEscrituracion,
} from "../../../src/engine/vivienda-nueva/escrituracion";
import {
  m2Aproximado,
  precioVerdadero,
  type EntradaPrecio,
} from "../../../src/engine/vivienda-nueva/precio-verdadero";
import { espera, mesesHasta } from "../../../src/engine/vivienda-nueva/espera";
import {
  mejorCaso,
  subsidiosPara,
  type Programa,
} from "../../../src/engine/vivienda-nueva/subsidio";
import {
  estadoEdicion,
  indice,
  zonaDe,
  type ProyectoIndice,
} from "../../../src/engine/vivienda-nueva/indice";
import { nuevoOUsado } from "../../../src/engine/vivienda-nueva/nuevo-o-usado";
import { fichaHonesta } from "../../../src/engine/vivienda-nueva/ficha-honesta";
import { alcanza } from "../../../src/engine/vivienda-nueva/alcanza";

// Los siete motores de la vivienda nueva, cada uno contra un caso calculado A MANO (el cálculo va en el comentario) y
// contra las tarifas y los programas reales de `src/data`. Datos de proyectos 100 % sintéticos.

const RAIZ = join(__dirname, "..", "..", "..");
const tarifas = JSON.parse(
  readFileSync(join(RAIZ, "src/data/tarifas-escrituracion.json"), "utf8"),
) as TarifasEscrituracion;
const subsidios = JSON.parse(
  readFileSync(join(RAIZ, "src/data/subsidios-vivienda.json"), "utf8"),
) as { programas: Programa[] };
const TOPE_BOGOTA = 262_635_750; // 150 × 1.750.905

describe("escrituración (Resoluciones 2026-001726-6 y 2026-000964-6 de la SNR)", () => {
  it("tope VIS: 150 salarios en la aglomeración de Bogotá y en la ciudad principal de las otras seis, 135 en el resto", () => {
    expect(topeVis("Bogotá", tarifas)).toBe(TOPE_BOGOTA);
    expect(topeVis("Chía", tarifas)).toBe(TOPE_BOGOTA);
    expect(topeVis("Cartagena", tarifas)).toBe(TOPE_BOGOTA); // 150 × 1.750.905
    expect(topeVis("Medellín", tarifas)).toBe(TOPE_BOGOTA);
    expect(topeVis("Ibagué", tarifas)).toBe(236_372_175); // 135 × 1.750.905
    expect(topeVis("", tarifas)).toBe(236_372_175);
  });

  it.each([
    // 300 M = 24.772,9 UVB → tramo 11,31 ‰ → 3.393.000 × 1,02 = 3.460.860 → 3.460.900
    [300_000_000, "general", 3_460_900],
    // 250 M = 20.644 UVB → 11,31 ‰ = 2.827.500 → mitad VIS 1.413.750 × 1,02 = 1.442.025 → 1.442.000
    [250_000_000, "vis", 1_442_000],
    // 10 M = 825,8 UVB → tarifa fija 53.100 × 1,02 = 54.162 → 54.200
    [10_000_000, "general", 54_200],
    // 600 M = 49.546 UVB → 13,33 ‰ = 7.998.000 × 1,02 = 8.157.960 → 8.158.000
    [600_000_000, "general", 8_158_000],
    // 150 M = 12.386,5 UVB → 9,11 ‰ = 1.366.500 × 1,02 = 1.393.830 → 1.393.800
    [150_000_000, "general", 1_393_800],
    [150_000_000, "vip", 0],
  ] as const)("registro de %d (%s) = %d", (valor, clase, esperado) => {
    expect(derechosRegistro(valor, clase, tarifas)).toBe(esperado);
  });

  it.each([
    // 30.900 + (300.000.000 − 259.300) × 3 ‰ = 930.122,1 → 930.100
    [300_000_000, "general", 930_100],
    // (30.900 + (250.000.000 − 259.300) × 3 ‰) / 2 = 390.061,05 → 390.100
    [250_000_000, "vis", 390_100],
    [200_000, "general", 30_900],
  ] as const)("notariales de %d (%s) = %d", (valor, clase, esperado) => {
    expect(derechosNotariales(valor, clase, tarifas)).toBe(esperado);
  });

  it("si una tarifa no está vigente en el archivo, no se calcula", () => {
    const sinVerificar = {
      ...tarifas,
      conceptos: tarifas.conceptos.map((c) => ({
        ...c,
        estado: "no_verificado",
      })),
    };
    expect(derechosRegistro(300_000_000, "general", sinVerificar)).toBeNull();
    expect(derechosNotariales(300_000_000, "general", sinVerificar)).toBeNull();
  });
});

function entrada(extra: Partial<EntradaPrecio> = {}): EntradaPrecio {
  return {
    precio_desde: 250_000_000,
    segmento: "VIS",
    ciudad: "Bogotá",
    area_privada_desde: 50,
    area_construida_desde: 56,
    parqueadero: "adicional",
    parqueadero_precio: 20_000_000,
    precio_fijo: "si",
    etapa: "en_construccion",
    ...extra,
  };
}

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("precio verdadero", () => {
  it("VIS en Bogotá con parqueadero aparte y precio fijo: al menos 271.442.000", () => {
    // 250.000.000 + registro VIS 1.442.000 + parqueadero 20.000.000
    const r = precioVerdadero(entrada(), tarifas);
    if (r.estado !== "calculado") throw new Error("debía calcular");
    expect(r.alMenos).toBe(271_442_000);
    expect(r.clase).toBe("vis");
    expect(ids(r.partidas)).toEqual([
      "precio_desde",
      "derechos_registro",
      "parqueadero",
    ]);
    expect(ids(r.faltantes)).toEqual([
      "derechos_notariales",
      "impuesto_registro",
      "iva_notarial",
      "hipoteca",
    ]);
    expect(r.faltantes[0].monto).toBe(390_100);
    expect(r.m2).toEqual({ base: "privada", area: 50, valor: 5_000_000 });
  });

  it("No VIS sin área privada, sin parqueadero dicho y sin precio fijo: nombra todo lo que falta", () => {
    // 300.000.000 + registro 3.460.900 = 303.460.900; m² sobre la construida: 300 M / 60 = 5 M
    const r = precioVerdadero(
      entrada({
        precio_desde: 300_000_000,
        segmento: "No VIS",
        area_privada_desde: NO_LO_DICE,
        area_construida_desde: 60,
        parqueadero: NO_LO_DICE,
        parqueadero_precio: null,
        precio_fijo: NO_LO_DICE,
        etapa: "sobre_planos",
      }),
      tarifas,
    );
    if (r.estado !== "calculado") throw new Error("debía calcular");
    expect(r.alMenos).toBe(303_460_900);
    expect(ids(r.faltantes)).toEqual([
      "parqueadero_no_lo_dice",
      "derechos_notariales",
      "impuesto_registro",
      "iva_notarial",
      "subidas_en_obra",
      "hipoteca",
    ]);
    expect(r.m2).toEqual({ base: "construida", area: 60, valor: 5_000_000 });
  });

  it("un «VIS» por encima del tope de este año se liquida como general y se dice", () => {
    // 331 M = 27.333 UVB → 11,31 ‰ = 3.743.610 × 1,02 = 3.818.482,2 → 3.818.500
    const r = precioVerdadero(entrada({ precio_desde: 331_000_000 }), tarifas);
    if (r.estado !== "calculado") throw new Error("debía calcular");
    expect(r.clase).toBe("general");
    expect(r.partidas[1]).toEqual({
      id: "derechos_registro",
      monto: 3_818_500,
    });
    expect(ids(r.faltantes)).toContain("supera_tope_vis");
  });

  it("sin segmento dicho y dentro del tope, la cota inferior liquida como VIS y lo nombra", () => {
    // 200 M = 16.515 UVB → 11,31 ‰ = 2.262.000 → mitad 1.131.000 × 1,02 = 1.153.620 → 1.153.600
    const r = precioVerdadero(
      entrada({
        precio_desde: 200_000_000,
        segmento: NO_LO_DICE,
        ciudad: "Chía",
      }),
      tarifas,
    );
    if (r.estado !== "calculado") throw new Error("debía calcular");
    expect(r.clase).toBe("vis");
    expect(r.partidas[1].monto).toBe(1_153_600);
    expect(ids(r.faltantes)).toContain("segmento_no_lo_dice");
  });

  it("VIP: el registro queda exento con subsidio y se nombra; los derechos notariales de VIP no se verifican y no se suman", () => {
    const r = precioVerdadero(
      entrada({ precio_desde: 150_000_000, segmento: "VIP" }),
      tarifas,
    );
    if (r.estado !== "calculado") throw new Error("debía calcular");
    expect(ids(r.partidas)).toEqual(["precio_desde", "parqueadero"]);
    expect(ids(r.faltantes)).toContain("exencion_vip_con_subsidio");
    expect(ids(r.faltantes)).not.toContain("derechos_notariales");
    expect(derechosNotariales(150_000_000, "vip", tarifas)).toBeNull();
  });

  it("parqueadero adicional sin precio, parqueadero «hay» y parqueadero incluido", () => {
    const sinPrecio = precioVerdadero(
      entrada({ parqueadero_precio: null }),
      tarifas,
    );
    const hay = precioVerdadero(
      entrada({ parqueadero: "hay_sin_precio", parqueadero_precio: null }),
      tarifas,
    );
    const incluido = precioVerdadero(
      entrada({ parqueadero: "incluido", parqueadero_precio: null }),
      tarifas,
    );
    for (const r of [sinPrecio, hay]) {
      if (r.estado !== "calculado") throw new Error("debía calcular");
      expect(ids(r.faltantes)).toContain("parqueadero_sin_precio");
    }
    if (incluido.estado !== "calculado") throw new Error("debía calcular");
    expect(
      ids(incluido.faltantes).some((f) => f.startsWith("parqueadero")),
    ).toBe(false);
  });

  it("entrega inmediata sin precio fijo no anuncia subidas durante la obra", () => {
    const r = precioVerdadero(
      entrada({ precio_fijo: NO_LO_DICE, etapa: "entrega_inmediata" }),
      tarifas,
    );
    if (r.estado !== "calculado") throw new Error("debía calcular");
    expect(ids(r.faltantes)).not.toContain("subidas_en_obra");
  });

  it("sin precio no hay cuenta; sin áreas no hay m²; una ciudad ilegible usa el tope general", () => {
    expect(
      precioVerdadero(entrada({ precio_desde: NO_LO_DICE }), tarifas).estado,
    ).toBe("sin_precio");
    expect(
      m2Aproximado(
        entrada({
          area_privada_desde: ILEGIBLE,
          area_construida_desde: NO_LO_DICE,
        }),
      ),
    ).toEqual({ base: null });
    expect(m2Aproximado(entrada({ precio_desde: NO_LO_DICE }))).toEqual({
      base: null,
    });
    // 250 M en ciudad ilegible: tope general 236.372.175 → el «VIS» se pasa → general y lo dice
    const r = precioVerdadero(entrada({ ciudad: ILEGIBLE }), tarifas);
    if (r.estado !== "calculado") throw new Error("debía calcular");
    expect(ids(r.faltantes)).toContain("supera_tope_vis");
  });

  it("si las tarifas no están vigentes, el «al menos» es el precio y el parqueadero, sin inventar registro", () => {
    const sinVerificar = {
      ...tarifas,
      conceptos: tarifas.conceptos.map((c) => ({
        ...c,
        estado: "no_verificado",
      })),
    };
    const r = precioVerdadero(entrada(), sinVerificar);
    if (r.estado !== "calculado") throw new Error("debía calcular");
    expect(r.alMenos).toBe(270_000_000);
    expect(ids(r.faltantes)).not.toContain("derechos_notariales");
  });
});

describe("un campo que dos páginas de la revista contradicen no se usa para calcular", () => {
  it("área privada contradicha: el m² cae a la construida; si las dos se contradicen, no hay m² y se dice por qué", () => {
    const privada = entrada({
      precio_desde: 270_000_000,
      area_privada_desde: 24,
      area_construida_desde: 54,
      en_conflicto: ["area_privada_desde"],
    });
    expect(m2Aproximado(privada)).toEqual({
      base: "construida",
      area: 54,
      valor: 5_000_000,
    });
    const ambas = {
      ...privada,
      en_conflicto: ["area_privada_desde", "area_construida_desde"],
    };
    expect(m2Aproximado(ambas)).toEqual({ base: null, razon: "en_conflicto" });
    // Sin ninguna área impresa no hay conflicto que decir: solo «no hay m²».
    expect(
      m2Aproximado(
        entrada({
          area_privada_desde: NO_LO_DICE,
          area_construida_desde: NO_LO_DICE,
        }),
      ),
    ).toEqual({ base: null });
  });

  it("precio contradicho: no hay «al menos» ni m², y no se elige uno de los dos", () => {
    const r = precioVerdadero(
      entrada({ en_conflicto: ["precio_desde"] }),
      tarifas,
    );
    expect(r).toEqual({
      estado: "en_conflicto",
      m2: { base: null, razon: "en_conflicto" },
    });
  });

  it("el índice deja fuera de la mediana al proyecto contradicho y lo cuenta aparte; con él dentro habría 5 y habría mediana", () => {
    const cinco = [5.0, 5.2, 5.4, 5.6, 5.8].map((m) =>
      pi({ precio_desde: m * 1_000_000 * 50 }),
    );
    expect(indice(cinco).porZona[0]).toMatchObject({
      estado: "mediana",
      n: 5,
      enConflicto: 0,
    });
    const conUnoContradicho = [
      ...cinco.slice(0, 4),
      { ...cinco[4], en_conflicto: ["area_privada_desde"] },
    ];
    expect(indice(conUnoContradicho).porZona[0]).toMatchObject({
      estado: "sin_datos",
      n: 5,
      conArea: 4,
      enConflicto: 1,
    });
  });

  it("la ficha honesta nombra el campo en conflicto y no lo cuenta como verificable", () => {
    const f = fichaHonesta({
      precio_desde: 250_000_000,
      area_privada_desde: 30,
      area_construida_desde: 56,
      segmento: "VIS",
      etapa: NO_LO_DICE,
      entrega: NO_LO_DICE,
      parqueadero: "incluido",
      precio_fijo: "si",
      subsidio_anunciado: NO_LO_DICE,
      rotulos: [],
      en_conflicto: ["area_privada_desde"],
    });
    expect(f.datos.find((d) => d.campo === "area_privada_desde")?.clase).toBe(
      "en_conflicto",
    );
    expect(f.verificables).toBe(5);
    expect(f.faltan).toBe(4);
  });
});

describe("la espera", () => {
  it("cuenta los meses hasta el final del mes de entrega y nunca en negativo", () => {
    expect(mesesHasta("2026-10-20", "2028-12")).toBe(26); // (2028 − 2026) × 12 + (12 − 10)
    expect(mesesHasta("2026-10-20", "2026-06")).toBe(0);
  });

  it("26 meses × $1.800.000 = $46.800.000, aproximada si la entrega es un semestre", () => {
    expect(
      espera(
        {
          entrega: "2028-12",
          entrega_precision: "semestre",
          etapa: NO_LO_DICE,
        },
        "2026-10-20",
        1_800_000,
      ),
    ).toEqual({
      estado: "calculada",
      meses: 26,
      total: 46_800_000,
      aproximada: true,
      vencida: false,
    });
    expect(
      espera(
        { entrega: "2027-03", entrega_precision: "mes", etapa: NO_LO_DICE },
        "2026-10-20",
        -5,
      ),
    ).toEqual({
      estado: "calculada",
      meses: 5,
      total: 0,
      aproximada: false,
      vencida: false,
    });
  });

  it("una fecha impresa que ya pasó se dice como vencida", () => {
    const r = espera(
      { entrega: "2026-06", entrega_precision: "mes", etapa: NO_LO_DICE },
      "2026-10-20",
      1_800_000,
    );
    expect(r).toMatchObject({ estado: "calculada", meses: 0, vencida: true });
  });

  it("entrega inmediata y sin fecha", () => {
    expect(
      espera(
        { entrega: "inmediata", entrega_precision: null, etapa: NO_LO_DICE },
        "2026-10-20",
        1,
      ).estado,
    ).toBe("inmediata");
    expect(
      espera(
        {
          entrega: NO_LO_DICE,
          entrega_precision: null,
          etapa: "entrega_inmediata",
        },
        "2026-10-20",
        1,
      ).estado,
    ).toBe("inmediata");
    expect(
      espera(
        { entrega: NO_LO_DICE, entrega_precision: null, etapa: "sobre_planos" },
        "2026-10-20",
        1,
      ).estado,
    ).toBe("sin_fecha");
  });
});

describe("¿te alcanza con subsidio?", () => {
  const programas = subsidios.programas;
  const vis = {
    segmento: "VIS" as const,
    precio_desde: 250_000_000,
    region: "bogota" as const,
  };
  const porId = (r: ReturnType<typeof subsidiosPara>) =>
    Object.fromEntries(r.map((x) => [x.id, x]));

  it("hogar de $5 M, VIS en Bogotá: los del Distrito por confirmar (el proyecto debe estar inscrito); sin cupos se dice", () => {
    const r = porId(subsidiosPara(5_000_000, vis, programas, TOPE_BOGOTA));
    expect(r.oferta_preferente).toMatchObject({
      estado: "por_confirmar",
      motivos: ["proyecto_inscrito"],
      maximo: 52_527_150,
    });
    // Reactiva tu Compra bajó a «no verificado» (sin segunda fuente): ya no es un programa que se calcule.
    expect(r.reactiva_tu_compra).toBeUndefined();
    // Reduce tu Cuota: la Alcaldía reabrió postulaciones el 11 de agosto de 2026; se le da el estado de esa fecha.
    expect(r.reduce_tu_cuota).toMatchObject({
      estado: "aplica",
      restaAlPrecio: false,
    });
    expect(r.subsidio_vivienda_nueva_nacional.estado).toBe("sin_cupos");
    expect(r.ahorro_para_mi_casa).toBeUndefined();
    expect(mejorCaso(Object.values(r))).toEqual({
      id: "oferta_preferente",
      monto: 52_527_150,
    });
  });

  it("ingreso por encima de 4 salarios, proyecto fuera de Bogotá y No VIS no aplican", () => {
    expect(
      porId(subsidiosPara(8_000_000, vis, programas, TOPE_BOGOTA))
        .oferta_preferente.motivos,
    ).toEqual(["ingreso"]);
    expect(
      porId(
        subsidiosPara(
          5_000_000,
          { ...vis, region: "sabana" },
          programas,
          TOPE_BOGOTA,
        ),
      ).reduce_tu_cuota.motivos,
    ).toEqual(["fuera_de_bogota"]);
    expect(
      porId(
        subsidiosPara(
          5_000_000,
          { ...vis, segmento: "No VIS" },
          programas,
          TOPE_BOGOTA,
        ),
      ).oferta_preferente.estado,
    ).toBe("no_aplica");
  });

  it("sin segmento dicho: por confirmar dentro del tope, no aplica por encima; un VIS sobre el tope queda por confirmar", () => {
    const dentro = porId(
      subsidiosPara(
        5_000_000,
        { ...vis, segmento: NO_LO_DICE, precio_desde: 200_000_000 },
        programas,
        TOPE_BOGOTA,
      ),
    );
    expect(dentro.oferta_preferente.motivos).toEqual([
      "segmento_no_lo_dice",
      "proyecto_inscrito",
    ]);
    const fuera = porId(
      subsidiosPara(
        5_000_000,
        { ...vis, segmento: NO_LO_DICE, precio_desde: 300_000_000 },
        programas,
        TOPE_BOGOTA,
      ),
    );
    expect(fuera.oferta_preferente).toMatchObject({
      estado: "no_aplica",
      motivos: ["supera_tope_vis"],
    });
    const caro = porId(
      subsidiosPara(
        5_000_000,
        { ...vis, precio_desde: 331_000_000 },
        programas,
        TOPE_BOGOTA,
      ),
    );
    expect(caro.oferta_preferente.motivos).toEqual([
      "supera_tope_vis",
      "proyecto_inscrito",
    ]);
  });

  it("un programa nacional vigente sin requisito de inscripción aplica; sin candidatos no hay mejor caso", () => {
    const nacional: Programa = {
      id: "ejemplo_nacional",
      ambito: "nacional",
      destino: "compra",
      estado: "vigente",
      ingreso_maximo_pesos_2026: null,
      monto: { pesos_2026: { minimo: null, maximo: 35_018_100 } },
    };
    const r = subsidiosPara(
      5_000_000,
      { ...vis, region: "sabana" },
      [nacional],
      TOPE_BOGOTA,
    );
    expect(r[0]).toMatchObject({ estado: "aplica", motivos: [] });
    expect(mejorCaso([])).toBeNull();
    const suspendido = subsidiosPara(
      5_000_000,
      vis,
      [{ ...nacional, estado: "suspendido" }],
      TOPE_BOGOTA,
    );
    expect(suspendido[0]).toMatchObject({
      estado: "sin_cupos",
      motivos: ["suspendido"],
    });
  });
});

function pi(extra: Partial<ProyectoIndice>): ProyectoIndice {
  return {
    tipo: "apartamento",
    etapa: NO_LO_DICE,
    entrega: NO_LO_DICE,
    region: "bogota",
    ciudad: "Bogotá",
    sector: "Suba",
    segmento: "VIS",
    precio_desde: 250_000_000,
    area_privada_desde: 50,
    ...extra,
  };
}

describe("índice", () => {
  it("la zona: localidad en Bogotá, municipio en la Sabana, lo demás aparte", () => {
    expect(zonaDe(pi({}))).toBe("bogota:Suba");
    expect(zonaDe(pi({ sector: "Polo Club" }))).toBe("bogota:sin_localidad");
    expect(zonaDe(pi({ sector: NO_LO_DICE }))).toBe("bogota:sin_localidad");
    expect(zonaDe(pi({ region: "sabana", ciudad: "Chía" }))).toBe(
      "sabana:Chía",
    );
    expect(zonaDe(pi({ region: "otra" }))).toBe("otra");
  });

  it("mediana del m² privado con 6 proyectos (5,0 … 6,0 M): (5,4 + 5,6) / 2 = 5,5 M; con 4, sin datos", () => {
    const suba = [5.0, 5.2, 5.4, 5.6, 5.8, 6.0].map((m) =>
      pi({ precio_desde: m * 1_000_000 * 50 }),
    );
    const chapinero = [6, 7, 8, 9].map((m) =>
      pi({ sector: "Chapinero", precio_desde: m * 1_000_000 * 50 }),
    );
    const sinArea = pi({ sector: "Chapinero", area_privada_desde: NO_LO_DICE });
    const lejos = pi({ region: "otra", ciudad: "Cartagena" });
    const i = indice([...suba, ...chapinero, sinArea, lejos]);
    const zonas = Object.fromEntries(i.porZona.map((g) => [g.clave, g]));
    expect(zonas["bogota:Suba"]).toMatchObject({
      estado: "mediana",
      n: 6,
      usados: 6,
      medianaM2: 5_500_000,
    });
    expect(zonas["bogota:Chapinero"]).toMatchObject({
      estado: "sin_datos",
      n: 5,
      conArea: 4,
      minimo: 5,
    });
    expect(zonas.otra).toBeUndefined();
    expect(i.bogota).toMatchObject({ estado: "mediana", n: 11, conArea: 10 });
    expect(i.sabana).toMatchObject({ estado: "sin_datos", n: 0 });
    expect(i.porSegmento.map((g) => g.clave)).toEqual(["VIS"]);
  });

  it("agrupa por franja de precio en su orden, aparte los sin precio, y cuenta las entregas inmediatas", () => {
    const franjas = [
      { clave: "bajo", hasta: 200_000_000 },
      { clave: "alto", hasta: null },
    ];
    const bajos = [4.0, 4.2, 4.4, 4.6, 4.8].map((m) =>
      pi({ precio_desde: m * 1_000_000 * 40, area_privada_desde: 40 }),
    );
    const altos = [
      pi({ precio_desde: 900_000_000, etapa: "entrega_inmediata" }),
      pi({ precio_desde: 800_000_000, entrega: "inmediata" }),
    ];
    const i = indice(
      [...bajos, ...altos, pi({ precio_desde: NO_LO_DICE })],
      franjas,
    );
    expect(i.porFranja.map((g) => [g.clave, g.n, g.estado])).toEqual([
      ["bajo", 5, "mediana"],
      ["alto", 2, "sin_datos"],
      ["sin_precio", 1, "sin_datos"],
    ]);
    expect(i.porFranja[0]).toMatchObject({ medianaM2: 4_400_000 });
    expect(i.entregasInmediatas).toBe(2);
    // Sin franjas: solo los sin precio; una franja que no cubre a nadie no aparece.
    expect(
      indice([pi({}), pi({ precio_desde: NO_LO_DICE })]).porFranja.map(
        (g) => g.clave,
      ),
    ).toEqual(["sin_precio"]);
    expect(
      indice([pi({ precio_desde: 900_000_000 })], [{ clave: "bajo", hasta: 1 }])
        .porFranja,
    ).toEqual([]);
  });

  it("deja fuera los locales, oficinas y lotes: el índice es de vivienda", () => {
    const i = indice([
      pi({ tipo: "otro" }),
      pi({ tipo: "lote" }),
      pi({ tipo: NO_LO_DICE }),
      pi({ tipo: "casa" }),
    ]);
    expect(i.bogota.n).toBe(2);
  });

  it("agrupa los segmentos ilegibles o mixtos con los que no lo dicen", () => {
    const i = indice([
      pi({ segmento: "mixto" }),
      pi({ segmento: ILEGIBLE }),
      pi({ segmento: NO_LO_DICE }),
      pi({ segmento: "No VIS" }),
    ]);
    expect(i.porSegmento.map((g) => [g.clave, g.n])).toEqual([
      ["No VIS", 1],
      ["no_lo_dice", 3],
    ]);
  });

  it("la edición vigente y el mes sin edición, con la fecha de corte como parámetro", () => {
    expect(estadoEdicion({ hasta: "2026-11-15" }, "2026-11-15")).toEqual({
      estado: "vigente",
      hasta: "2026-11-15",
    });
    expect(estadoEdicion({ hasta: "2026-11-15" }, "2026-11-20")).toEqual({
      estado: "sin_edicion",
      vencida: "2026-11-15",
      dias: 5,
    });
  });
});

describe("¿nuevo o usado?", () => {
  const fuente = { nombre: "anuncios de ejemplo", fecha: "2026-10-20" };
  const nuevos = [5.0, 5.2, 5.4, 5.6, 5.8, 6.0].map((m, i) => ({
    id: `n${i}`,
    alMenos: 280_000_000 - i,
    m2Privado: m * 1_000_000,
  }));
  const usados = [4.0, 4.2, 4.4, 4.6, 4.8, 5.0].map((m) => ({
    area_m2: 60,
    precio_esperado: m * 1_000_000 * 60,
  }));

  it("con 6 y 6: nuevo 5,5 M frente a usado 4,5 M (P25 4,25 · P75 4,75) = 22 % más por estrenar", () => {
    const r = nuevoOUsado(300_000_000, nuevos, usados, fuente);
    expect(r.nuevos).toEqual({
      caben: ["n5", "n4", "n3", "n2", "n1", "n0"],
      n: 6,
      medianaM2: 5_500_000,
    });
    expect(r.usados).toEqual({
      estado: "con_datos",
      n: 6,
      medianaM2: 4_500_000,
      p25M2: 4_250_000,
      p75M2: 4_750_000,
      fuente,
    });
    expect(r.diferencia).toBe(22); // (5,5 / 4,5 − 1) × 100 = 22,2
  });

  it("con menos de 5 usados en el presupuesto: sin datos suficientes, y sin diferencia", () => {
    // Solo el usado de 4,0 M × 60 m² = $240 M cabe en $250 M: 1 de 5.
    const r = nuevoOUsado(250_000_000, nuevos, usados, fuente);
    expect(r.usados).toMatchObject({ estado: "sin_datos", n: 1, minimo: 5 });
    expect(r.nuevos.n).toBe(0);
    expect(r.nuevos.medianaM2).toBeNull();
    expect(r.diferencia).toBeNull();
  });

  it("los nuevos sin precio no caben y los que no traen m² no cuentan para la mediana", () => {
    const r = nuevoOUsado(
      300_000_000,
      [
        { id: "x", alMenos: null, m2Privado: 5_000_000 },
        { id: "y", alMenos: 100, m2Privado: null },
      ],
      usados,
      fuente,
    );
    expect(r.nuevos).toEqual({ caben: ["y"], n: 1, medianaM2: null });
  });
});

describe("ficha honesta", () => {
  it("separa el dato verificable, el que el aviso no dice y el ilegible, y aparta los mensajes de venta", () => {
    const f = fichaHonesta({
      precio_desde: 250_000_000,
      area_privada_desde: ILEGIBLE,
      area_construida_desde: 56,
      segmento: "VIS",
      etapa: NO_LO_DICE,
      entrega: NO_LO_DICE,
      parqueadero: "incluido",
      precio_fijo: "si",
      subsidio_anunciado: NO_LO_DICE,
      rotulos: ["lanzamiento", "otro", "otro"],
    });
    expect(f.verificables).toBe(5);
    expect(f.faltan).toBe(4);
    expect(f.datos.find((d) => d.campo === "area_privada_desde")?.clase).toBe(
      "ilegible",
    );
    expect(f.datos.find((d) => d.campo === "entrega")?.clase).toBe(
      "no_lo_dice",
    );
    expect(f.mensajes).toEqual(["lanzamiento"]);
    expect(f.otrosMensajes).toBe(2);
  });
});

describe("lo que puedes pagar filtra la vivienda nueva", () => {
  it("compara el tope con el precio verdadero, ordena de menor a mayor y aparta los sin precio", () => {
    const r = alcanza(
      [
        { id: "a", alMenos: 310_000_000 },
        { id: "b", alMenos: 250_000_000 },
        { id: "c", alMenos: null },
        { id: "d", alMenos: 300_000_000 },
      ],
      300_000_000,
    );
    expect(ids(r.caben)).toEqual(["b", "d"]);
    expect(ids(r.noCaben)).toEqual(["a"]);
    expect(ids(r.sinPrecio)).toEqual(["c"]);
  });
});
