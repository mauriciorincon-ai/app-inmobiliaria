// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ILEGIBLE,
  NO_LO_DICE,
} from "../../../src/engine/vivienda-nueva/edicion";
import {
  topeVis,
  type TarifasEscrituracion,
} from "../../../src/engine/vivienda-nueva/escrituracion";
import { fichaHonesta } from "../../../src/engine/vivienda-nueva/ficha-honesta";
import { indice } from "../../../src/engine/vivienda-nueva/indice";
import type { ProyectoUnico } from "../../../src/engine/vivienda-nueva/lectura";
import { precioVerdadero } from "../../../src/engine/vivienda-nueva/precio-verdadero";
import {
  edicionVigente,
  franjasNuevos,
  entregaPartes,
  hayFiltrosNuevos,
  leerFiltrosNuevos,
  leerPagina,
  paramsNuevos,
  vistaIndice,
  vistaLista,
  vistaProyecto,
  type EdicionPublicada,
  type FiltrosNuevos,
  type ProyectoPublicado,
} from "../../../src/engine/vivienda-nueva/vista";
import { edicion187 } from "../utils/edicion-187";

// Lo que el servidor entrega a las pantallas de vivienda nueva (S12, F2): cada cifra sale del motor y nada se calcula a
// mano. Fixture sintético para las ramas; al final, los 143 proyectos REALES ya procesados de la edición 187 (los de la
// maqueta aprobada, versionados) pasan por la base de ida y vuelta y salen idénticos al motor llamado directo.

const RAIZ = join(__dirname, "..", "..", "..");
const tarifas = JSON.parse(
  readFileSync(join(RAIZ, "src/data/tarifas-escrituracion.json"), "utf8"),
) as TarifasEscrituracion;
const sinVerificar: TarifasEscrituracion = {
  ...tarifas,
  conceptos: tarifas.conceptos.map((c) => ({ ...c, estado: "no_verificado" })),
};
const TOPE_BOGOTA = topeVis("Bogotá", tarifas);

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

const ED = (
  numero: number,
  desde: string,
  hasta: string,
): EdicionPublicada => ({
  numero,
  nombre: "Edición de Prueba",
  desde,
  hasta,
  paginas: 10,
});

describe("edicionVigente: la misma regla que nuevos_publicados (migración 15)", () => {
  const e187 = ED(187, "2026-10-15", "2026-11-15");
  const e188 = ED(188, "2026-11-15", "2026-12-15");

  it("sin ediciones, o solo una que aún no empieza: sin publicar", () => {
    expect(edicionVigente([], "2026-10-20")).toEqual({
      estado: "sin_publicar",
    });
    expect(edicionVigente([e188], "2026-10-20")).toEqual({
      estado: "sin_publicar",
    });
  });

  it("dentro de su ventana, incluidos el primer y el último día, está vigente", () => {
    for (const hoy of ["2026-10-15", "2026-10-20", "2026-11-15"]) {
      expect(edicionVigente([e187], hoy)).toEqual({
        estado: "vigente",
        edicion: e187,
      });
    }
  });

  it("con dos ventanas que se tocan, manda la de mayor número", () => {
    expect(edicionVigente([e187, e188], "2026-11-15").estado).toBe("vigente");
    expect(
      (
        edicionVigente([e187, e188], "2026-11-15") as {
          edicion: EdicionPublicada;
        }
      ).edicion.numero,
    ).toBe(188);
  });

  it("vencidas todas: «mes sin edición» con la última publicada y los días que lleva vencida", () => {
    expect(edicionVigente([e187], "2026-11-16")).toEqual({
      estado: "sin_edicion",
      edicion: e187,
      vencida: "2026-11-15",
      dias: 1,
    });
    const r = edicionVigente([e188, e187], "2027-03-25");
    expect(r).toMatchObject({ estado: "sin_edicion", dias: 100 });
    expect((r as { edicion: EdicionPublicada }).edicion.numero).toBe(188);
  });
});

describe("leerFiltrosNuevos / paramsNuevos (la URL de «Nuevos»; jamás lanza)", () => {
  it("lee cada filtro válido y vuelve a la misma URL", () => {
    const f = leerFiltrosNuevos({
      v: "nuevos",
      lugar: "sabana:Cajicá",
      franja: "hasta_tope_vis",
      segmento: "no_vis",
      etapa: "sobre_planos",
      entrega: "2027",
      max: "300000000",
      pago: "1",
    });
    expect(f).toEqual({
      lugar: "sabana:Cajicá",
      franja: "hasta_tope_vis",
      segmento: "no_vis",
      etapa: "sobre_planos",
      entrega: 2027,
      max: 300_000_000,
      pago: true,
    });
    expect(leerFiltrosNuevos(Object.fromEntries(paramsNuevos(f)))).toEqual(f);
    expect(paramsNuevos(f).toString().startsWith("v=nuevos&")).toBe(true);
    expect(hayFiltrosNuevos(f)).toBe(true);
  });

  it("sin nada: solo `v=nuevos`, sin filtros ni tope", () => {
    const f = leerFiltrosNuevos({});
    expect(f).toEqual({ pago: false });
    expect(paramsNuevos(f).toString()).toBe("v=nuevos");
    expect(hayFiltrosNuevos(f)).toBe(false);
    expect(hayFiltrosNuevos({ pago: false, entrega: "inmediata" })).toBe(true);
  });

  it("lo que no se entiende se ignora (incluidas claves del prototipo y valores repetidos)", () => {
    expect(
      leerFiltrosNuevos({
        lugar: "cartagena",
        franja: "barata",
        segmento: "toString",
        etapa: "lista",
        entrega: "pronto",
        max: "-5",
        pago: "1",
      }),
    ).toEqual({ pago: false });
    expect(leerFiltrosNuevos({ entrega: "1999" })).toEqual({ pago: false });
    expect(leerFiltrosNuevos({ max: "0" })).toEqual({ pago: false });
    expect(leerFiltrosNuevos({ max: "900000000001" })).toEqual({ pago: false });
    expect(leerFiltrosNuevos({ lugar: "bogota: Suba" })).toEqual({
      pago: false,
    });
    expect(leerFiltrosNuevos({ lugar: ["bogota", "sabana"] }).lugar).toBe(
      "bogota",
    );
    expect(leerFiltrosNuevos({ entrega: "inmediata" }).entrega).toBe(
      "inmediata",
    );
    // `pago=1` sin un tope válido no rotula nada.
    expect(leerFiltrosNuevos({ pago: "1" }).pago).toBe(false);
  });
});

describe("leerPagina y entregaPartes", () => {
  it("la página es 1 por omisión, se acota y nunca lanza", () => {
    expect(leerPagina({})).toBe(1);
    expect(leerPagina({ pag: "3" })).toBe(3);
    expect(leerPagina({ pag: ["2", "9"] })).toBe(2);
    expect(leerPagina({ pag: "0" })).toBe(1);
    expect(leerPagina({ pag: "-4" })).toBe(1);
    expect(leerPagina({ pag: "abc" })).toBe(1);
    expect(leerPagina({ pag: "9999" })).toBe(1); // más de tres cifras no se entiende
    expect(leerPagina({ pag: "500" })).toBe(20); // se acota
  });

  it("la entrega se dice según su precisión: mes exacto, hasta un mes o durante el año", () => {
    expect(entregaPartes("2028-12", "mes")).toEqual({
      anio: 2028,
      mes: 12,
      forma: "mes",
    });
    expect(entregaPartes("2028-12", null)?.forma).toBe("mes");
    expect(entregaPartes("2028-06", "semestre")?.forma).toBe("hasta");
    expect(entregaPartes("2028-09", "trimestre")?.forma).toBe("hasta");
    expect(entregaPartes("2029-12", "anio")?.forma).toBe("anio");
    expect(entregaPartes("inmediata", null)).toBeNull();
    expect(entregaPartes(NO_LO_DICE, null)).toBeNull();
  });
});

describe("franjas e índice", () => {
  it("el tope VIS de la franja sale de las tarifas", () => {
    expect(franjasNuevos(tarifas).map((f) => f.hasta)).toEqual([
      150_000_000,
      TOPE_BOGOTA,
      400_000_000,
      null,
    ]);
  });

  it("vistaIndice es el motor del índice con esas franjas; una zona con 4 proyectos no da mediana y con 5 sí", () => {
    const cuatro = [1, 2, 3, 4].map((i) =>
      pp(`k${i}`, { sector: "Kennedy", precio_desde: 200_000_000 + i * 1e6 }),
    );
    const cinco = [1, 2, 3, 4, 5].map((i) =>
      pp(`s${i}`, { sector: "Suba", precio_desde: 250_000_000 + i * 1e6 }),
    );
    const v = vistaIndice([...cuatro, ...cinco], tarifas);
    const zona = (k: string) => v.porZona.find((g) => g.clave === k)!;
    expect(zona("bogota:Kennedy").estado).toBe("sin_datos");
    expect(zona("bogota:Suba")).toMatchObject({ estado: "mediana", usados: 5 });
    expect(v).toEqual(
      indice(
        [...cuatro, ...cinco].map((p) => ({ ...p })),
        franjasNuevos(tarifas),
      ),
    );
  });

  it("un proyecto con el precio en conflicto sale del m² y se cuenta aparte", () => {
    const cinco = [1, 2, 3, 4, 5].map((i) =>
      pp(`s${i}`, { precio_desde: 250_000_000 + i * 1e6 }),
    );
    cinco[0] = { ...cinco[0], en_conflicto: ["precio_desde"] };
    const g = vistaIndice(cinco, tarifas).porZona[0];
    expect(g).toMatchObject({
      estado: "sin_datos",
      conArea: 4,
      enConflicto: 1,
    });
  });
});

describe("vistaLista", () => {
  const lista = [
    pp("barato", { precio_desde: 150_000_000 }),
    pp("medio", { precio_desde: 250_000_000, sector: "Kennedy" }),
    pp("caro", {
      precio_desde: 500_000_000,
      segmento: "No VIS",
      etapa: "sobre_planos",
      entrega: "2030-06",
    }),
    pp("sin-precio", { precio_desde: NO_LO_DICE }),
    pp("conflicto", { en_conflicto: ["precio_desde"] }),
    pp("ya", {
      precio_desde: 300_000_000,
      etapa: "entrega_inmediata",
      entrega: "inmediata",
      segmento: "mixto",
    }),
    pp("cajica", { region: "sabana", ciudad: "Cajicá", sector: NO_LO_DICE }),
    pp("ilegible", {
      precio_desde: 200_000_000,
      segmento: ILEGIBLE,
      etapa: ILEGIBLE,
      entrega: NO_LO_DICE,
    }),
    pp("vip", { precio_desde: 140_000_000, segmento: "VIP" }),
    // Fuera del universo: otra ciudad, un lote y un local.
    pp("cartagena", { region: "otra", ciudad: "Cartagena" }),
    pp("lote", { tipo: "lote" }),
    pp("local", { tipo: "otro" }),
  ];
  const slugs = (xs: { slug: string }[]) => xs.map((x) => x.slug);
  const f = (extra: Partial<FiltrosNuevos> = {}): FiltrosNuevos => ({
    pago: false,
    ...extra,
  });

  it("solo vivienda de Bogotá y la Sabana; sin tope, todo lo que tiene precio va «dentro», del «al menos» más bajo al más alto", () => {
    const v = vistaLista(lista, tarifas, f());
    expect(v.total).toBe(9);
    expect(v.coinciden).toBe(9);
    expect(v.tope).toBeNull();
    expect(v.fuera).toEqual([]);
    expect(slugs(v.sinPrecio).sort()).toEqual(["conflicto", "sin-precio"]);
    const al = v.dentro.map((t) =>
      t.precio.estado === "calculado" ? t.precio.alMenos : -1,
    );
    expect([...al].sort((a, b) => a - b)).toEqual(al);
    expect(slugs(v.dentro)).not.toContain("cartagena");
  });

  it("con tope: compara el precio VERDADERO, no el «desde»", () => {
    const pvMedio = precioVerdadero(lista[1], tarifas);
    if (pvMedio.estado !== "calculado") throw new Error("debía calcular");
    // Un tope igual al «desde» deja fuera al proyecto: el «al menos» es mayor.
    const v = vistaLista(lista, tarifas, f({ max: 250_000_000 }));
    expect(slugs(v.fuera)).toContain("medio");
    const justo = vistaLista(lista, tarifas, f({ max: pvMedio.alMenos }));
    expect(slugs(justo.dentro)).toContain("medio");
    expect(justo.tope).toBe(pvMedio.alMenos);
  });

  it("cada tarjeta trae el resumen del motor y cuántos datos calla", () => {
    const v = vistaLista(lista, tarifas, f());
    const t = [...v.dentro, ...v.sinPrecio].find((x) => x.slug === "medio")!;
    const pv = precioVerdadero(lista[1], tarifas);
    if (pv.estado !== "calculado") throw new Error("debía calcular");
    expect(t.precio).toEqual({
      estado: "calculado",
      desde: pv.desde,
      alMenos: pv.alMenos,
      m2: pv.m2,
    });
    expect(t.datos).toBe(9);
    expect(t.faltan).toBe(1); // subsidio_anunciado: no lo dice
    const c = v.sinPrecio.find((x) => x.slug === "conflicto")!;
    expect(c.precio.estado).toBe("en_conflicto");
  });

  it("filtra por lugar (región o zona), franja, segmento, etapa y entrega", () => {
    const de = (extra: Partial<FiltrosNuevos>) => {
      const v = vistaLista(lista, tarifas, f(extra));
      return [...v.dentro, ...v.fuera, ...v.sinPrecio]
        .map((t) => t.slug)
        .sort();
    };
    expect(de({ lugar: "sabana" })).toEqual(["cajica"]);
    expect(de({ lugar: "sabana:Cajicá" })).toEqual(["cajica"]);
    expect(de({ lugar: "bogota:Kennedy" })).toEqual(["medio"]);
    expect(de({ franja: "hasta_150" })).toEqual(["barato", "vip"]);
    expect(de({ franja: "mas_de_400" })).toEqual(["caro"]);
    // «Sin precio» es solo lo que no imprime precio: el precio en conflicto cuenta en su franja (S16, como el índice).
    expect(de({ franja: "sin_precio" })).toEqual(["sin-precio"]);
    expect(de({ segmento: "no_vis" })).toEqual(["caro"]);
    expect(de({ segmento: "no_lo_dice" })).toEqual(["ilegible", "ya"]);
    expect(de({ segmento: "vip" })).toEqual(["vip"]);
    expect(de({ etapa: "sobre_planos" })).toEqual(["caro"]);
    expect(de({ etapa: "no_lo_dice" })).toEqual(["ilegible"]);
    expect(de({ entrega: "inmediata" })).toEqual(["ya"]);
    // Hasta 2028 entra lo inmediato y lo de 2028; ni lo de 2030 ni lo que no dice su fecha.
    expect(de({ entrega: 2028 })).not.toContain("caro");
    expect(de({ entrega: 2028 })).toContain("ya");
    expect(de({ entrega: 2028 })).not.toContain("ilegible");
    expect(
      de({ lugar: "bogota", segmento: "no_vis", franja: "hasta_150" }),
    ).toEqual([]);
  });

  it("un precio en conflicto cuenta en su franja (S16); una entrega en conflicto no cumple ningún filtro de entrega (S13)", () => {
    const con = [
      pp("precio-dudoso", {
        precio_desde: 100_000_000,
        en_conflicto: ["precio_desde"],
      }),
      pp("entrega-dudosa", {
        entrega: "2026-12",
        en_conflicto: ["entrega"],
      }),
      pp("etapa-dudosa", {
        etapa: "entrega_inmediata",
        entrega: "inmediata",
        en_conflicto: ["etapa"],
      }),
      pp("limpio", { entrega: "2027-06" }),
    ];
    const de = (extra: Partial<FiltrosNuevos>) => {
      const v = vistaLista(con, tarifas, f(extra));
      return [...v.dentro, ...v.fuera, ...v.sinPrecio]
        .map((t) => t.slug)
        .sort();
    };
    // Su «desde» impreso está en «hasta 150»: ahí cuenta, con la tarjeta «en conflicto» (no en «sin precio»).
    expect(de({ franja: "hasta_150" })).toEqual(["precio-dudoso"]);
    expect(de({ franja: "sin_precio" })).toEqual([]);
    expect(
      vistaLista(con, tarifas, f({ franja: "hasta_150" })).sinPrecio[0].precio.estado,
    ).toBe("en_conflicto");
    // Ni «inmediata» ni «hasta 2027» los da por cumplidos, aunque cada página imprima una fecha.
    expect(de({ entrega: "inmediata" })).toEqual([]);
    expect(de({ entrega: 2027 })).toEqual(["limpio"]);
    // Sin filtro de entrega siguen en la lista: se nombran, no se esconden.
    expect(de({})).toHaveLength(4);
    // Los años para elegir no salen de una entrega en disputa.
    expect(vistaLista(con, tarifas, f()).anios).toEqual([2027, 2028]);
  });

  it("los lugares para elegir, con su número de proyectos, antes de filtrar", () => {
    const v = vistaLista(lista, tarifas, f({ lugar: "sabana" }));
    const n = (k: string) => v.lugares.find((l) => l.clave === k)?.n;
    expect(n("bogota")).toBe(8);
    expect(n("sabana")).toBe(1);
    expect(n("sabana:Cajicá")).toBe(1);
    expect(n("bogota:Kennedy")).toBe(1);
    expect(n("otra")).toBeUndefined();
    // Los años de entrega que imprime la edición (la inmediata y la que no dice fecha no tienen año).
    expect(v.anios).toEqual([2028, 2030]);
  });
});

describe("vistaProyecto", () => {
  const HOY = "2026-10-20";
  const lista = [
    pp("alba", { entrega: "2027-10", entrega_precision: "semestre" }),
    pp("ya", { entrega: "inmediata", etapa: "entrega_inmediata" }),
    pp("muda", { entrega: NO_LO_DICE, ciudad: ILEGIBLE, region: "sin_ciudad" }),
    pp("sin-precio", { precio_desde: NO_LO_DICE }),
  ];

  it("un slug que no existe: null", () => {
    expect(vistaProyecto(lista, "no-existe", tarifas, HOY)).toBeNull();
  });

  it("un proyecto sin la lista de conflictos (filas antiguas) se lee como sin conflictos", () => {
    const viejo = pp("viejo");
    delete (viejo as { en_conflicto?: unknown }).en_conflicto;
    expect(vistaProyecto([viejo], "viejo", tarifas, HOY)!.enConflicto).toEqual(
      [],
    );
  });

  it("el precio es el del motor, con la norma y la fecha de cada derecho que se suma o se da", () => {
    const v = vistaProyecto(lista, "alba", tarifas, HOY)!;
    expect(v.precio).toEqual(precioVerdadero(lista[0], tarifas));
    expect(v.normas.derechos_registro?.norma).toMatch(/2026-001726-6/);
    expect(v.normas.derechos_registro?.consultado).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(v.normas.derechos_notariales?.norma).toMatch(/2026-000964-6/);
    expect(v.paginas).toEqual([4]);
    expect(v.topeVis).toBe(TOPE_BOGOTA);
    expect(v.alcanza).toBeNull();
  });

  it("la espera sale en MESES, sin total: el arriendo no llega al servidor", () => {
    const v = vistaProyecto(lista, "alba", tarifas, HOY)!;
    expect(v.espera).toEqual({
      estado: "calculada",
      meses: 12,
      aproximada: true,
      vencida: false,
    });
    expect(JSON.stringify(v)).not.toMatch(/"total"/);
    expect(vistaProyecto(lista, "ya", tarifas, HOY)!.espera).toEqual({
      estado: "inmediata",
    });
    expect(vistaProyecto(lista, "muda", tarifas, HOY)!.espera).toEqual({
      estado: "sin_fecha",
    });
  });

  it("una entrega o una etapa en conflicto: la espera no se calcula con ninguna y se nombra (S13)", () => {
    const dudosos = [
      pp("entrega-en-disputa", {
        entrega: "2027-01",
        en_conflicto: ["entrega"],
      }),
      pp("etapa-en-disputa", { en_conflicto: ["etapa"] }),
      pp("precision-en-disputa", { en_conflicto: ["entrega_precision"] }),
    ];
    for (const d of dudosos) {
      expect(vistaProyecto(dudosos, d.slug, tarifas, HOY)!.espera).toEqual({
        estado: "en_conflicto",
      });
    }
    // Otro campo en conflicto (el precio) no toca la espera.
    const otro = [pp("otro", { en_conflicto: ["precio_desde"] })];
    expect(vistaProyecto(otro, "otro", tarifas, HOY)!.espera.estado).toBe(
      "calculada",
    );
  });

  it("una ciudad ilegible usa el tope VIS general", () => {
    expect(vistaProyecto(lista, "muda", tarifas, HOY)!.topeVis).toBe(
      topeVis("", tarifas),
    );
  });

  it("contra lo que puedes pagar: dentro, fuera o sin precio", () => {
    const pv = precioVerdadero(lista[0], tarifas);
    if (pv.estado !== "calculado") throw new Error("debía calcular");
    expect(
      vistaProyecto(lista, "alba", tarifas, HOY, pv.alMenos)!.alcanza,
    ).toBe("dentro");
    expect(
      vistaProyecto(lista, "alba", tarifas, HOY, pv.alMenos - 1)!.alcanza,
    ).toBe("fuera");
    expect(vistaProyecto(lista, "sin-precio", tarifas, HOY, 1e9)!.alcanza).toBe(
      "sin_precio",
    );
  });

  it("DEMO EN ROJO: con las tarifas sin verificar, el «al menos» baja y el registro se NOMBRA, jamás se suma", () => {
    const bien = vistaProyecto(lista, "alba", tarifas, HOY)!;
    const mal = vistaProyecto(lista, "alba", sinVerificar, HOY)!;
    if (
      bien.precio.estado !== "calculado" ||
      mal.precio.estado !== "calculado"
    ) {
      throw new Error("debía calcular");
    }
    expect(bien.precio.partidas.map((p) => p.id)).toContain(
      "derechos_registro",
    );
    expect(mal.precio.alMenos).toBe(250_000_000);
    expect(mal.precio.alMenos).toBeLessThan(bien.precio.alMenos);
    expect(mal.precio.partidas.map((p) => p.id)).toEqual(["precio_desde"]);
    expect(mal.precio.faltantes).toContainEqual({ id: "derechos_registro" });
    expect(mal.precio.faltantes).toContainEqual({ id: "derechos_notariales" });
    expect(mal.normas).toEqual({
      derechos_registro: null,
      derechos_notariales: null,
    });
  });
});

// --- los 143 proyectos reales de la edición 187 ------------------------------------------------------------------------
describe("lo publicado = el motor (la edición 187 real, de ida y vuelta por la base)", () => {
  const { d, unidos, publicados } = edicion187();

  it("son los 143 proyectos de la edición", () => {
    expect(publicados).toHaveLength(143);
  });

  it("el «pagas al menos» de cada proyecto es el del motor y el de la maqueta aprobada", () => {
    let comprobados = 0;
    for (let i = 0; i < unidos.length; i++) {
      const v = vistaProyecto(
        publicados,
        publicados[i].slug,
        tarifas,
        d.fechaCorte,
      )!;
      const motor = precioVerdadero(unidos[i], tarifas);
      expect(v.precio, publicados[i].slug).toEqual(motor);
      expect(JSON.parse(JSON.stringify(v.precio))).toEqual(
        d.proyectos[i].precioVerdadero,
      );
      // La ficha es la del motor; contra la maqueta, los mensajes como conjunto (la maqueta guarda los rótulos ordenados).
      expect(v.ficha).toEqual(fichaHonesta(unidos[i]));
      const orden = (f: { mensajes: string[] }) => ({
        ...f,
        mensajes: [...f.mensajes].sort(),
      });
      expect(orden(v.ficha)).toEqual(orden(d.proyectos[i].ficha));
      // La espera de la maqueta trae el total con su arriendo de ejemplo; la del servidor, solo los meses.
      const meses = { ...d.proyectos[i].espera } as { total?: number };
      delete meses.total;
      expect(v.espera).toEqual(meses);
      comprobados++;
    }
    expect(comprobados).toBe(143);
  });

  it("el índice es el de la maqueta aprobada (mismas medianas, mismos conteos)", () => {
    expect(
      JSON.parse(JSON.stringify(vistaIndice(publicados, tarifas))),
    ).toEqual(d.indice);
  });

  it("la lista es el universo de la maqueta: los mismos proyectos dentro de lo que puedes pagar y fuera", () => {
    const v = vistaLista(publicados, tarifas, {
      max: d.hogar.tope!,
      pago: true,
    });
    const idDe = new Map(publicados.map((p, i) => [p.slug, d.proyectos[i].id]));
    const ids = (xs: { slug: string }[]) => xs.map((x) => idDe.get(x.slug));
    // Los mismos proyectos en cada grupo; el orden es del «al menos» más bajo al más alto (los empates, por slug).
    expect(ids(v.dentro).sort()).toEqual([...d.alcanza.caben].sort());
    expect(ids(v.fuera).sort()).toEqual([...d.alcanza.noCaben].sort());
    expect(ids(v.sinPrecio).sort()).toEqual([...d.alcanza.sinPrecio].sort());
    for (const grupo of [v.dentro, v.fuera]) {
      const al = grupo.map((t) =>
        t.precio.estado === "calculado" ? t.precio.alMenos : -1,
      );
      expect(al).toEqual([...al].sort((x, y) => x - y));
    }
  });

  it("el cálculo de una página cabe en el Worker: la lista con el índice, y una ficha, medidos", () => {
    const mediana = (fn: () => void) => {
      const veces: number[] = [];
      for (let r = 0; r < 25; r++) {
        const t0 = performance.now();
        fn();
        veces.push(performance.now() - t0);
      }
      return veces.sort((x, y) => x - y)[12];
    };
    // Lo que hace cada página: «Nuevos» calcula la lista y el índice; la ficha calcula UN proyecto.
    const lista = mediana(() => {
      vistaLista(publicados, tarifas, { pago: false });
      vistaIndice(publicados, tarifas);
    });
    const ficha = mediana(() => {
      for (const p of publicados) {
        vistaProyecto(publicados, p.slug, tarifas, d.fechaCorte);
      }
    });
    // La cifra va al cierre (`--reporter=verbose` la muestra); el Worker gratis da 10 ms de CPU por petición.
    console.info(
      `vista de vivienda nueva (143 proyectos): lista + índice = ${lista.toFixed(2)} ms · una ficha = ${(ficha / 143).toFixed(3)} ms (medianas de 25)`,
    );
    expect(lista).toBeLessThan(50);
    expect(ficha / 143).toBeLessThan(5);
  });
});
