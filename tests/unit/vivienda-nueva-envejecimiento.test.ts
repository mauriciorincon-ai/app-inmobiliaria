// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hoyBogota } from "../../src/engine/agenda/bogota";
import type { TarifasEscrituracion } from "../../src/engine/vivienda-nueva/escrituracion";
import type { Subsidios } from "../../src/engine/vivienda-nueva/normas";
import {
  edicionVigente,
  vistaIndice,
  vistaLista,
  vistaNuevoOUsado,
  vistaProyecto,
  vistaTeAlcanza,
  vistaVisitaSala,
  type EdicionPublicada,
  type ProyectoPublicado,
  type Vigencia,
  type VistaVisitaSala,
} from "../../src/engine/vivienda-nueva/vista";
import { edicion187 } from "./utils/edicion-187";

// Matriz de envejecimiento de la vivienda nueva (regla 23). Lo que ven las pantallas se construye en CADA fecha en que
// algo cambia: el día antes de la edición, su primer día, la fecha de corte de la maqueta, su último día, el día después y
// cien días después. La fecha es una perilla, nunca el reloj: con la 187 real, nada lanza, la edición dice su estado y
// «la espera» nunca es negativa ni crece con el tiempo. Desde el S13 también «¿Nuevo o usado?» (su espera, en las mismas
// fechas), «¿Te alcanza?» y la visita a la sala, que con la edición vencida dice «mes sin edición» y no se ofrece. La demo
// en rojo pone a prueba al propio gate: una vista que lee el reloj, o que olvida la vigencia, debe caer.

const RAIZ = join(__dirname, "..", "..");
const tarifas = JSON.parse(
  readFileSync(join(RAIZ, "src/data/tarifas-escrituracion.json"), "utf8"),
) as TarifasEscrituracion;
const subsidios = JSON.parse(
  readFileSync(join(RAIZ, "src/data/subsidios-vivienda.json"), "utf8"),
) as Subsidios;
const { d, publicados } = edicion187();
const USADOS = Array.from({ length: 12 }, (_, i) => ({
  area_m2: 50,
  precio_esperado: 250_000_000 + i * 5_000_000,
}));
const EDICION: EdicionPublicada = {
  numero: d.edicion.numero,
  nombre: "Estrenar Vivienda",
  desde: d.edicion.desde,
  hasta: d.edicion.hasta,
  paginas: 68,
};

const MATRIZ: { hoy: string; estado: Vigencia["estado"]; dias?: number }[] = [
  { hoy: "2026-10-14", estado: "sin_publicar" },
  { hoy: "2026-10-15", estado: "vigente" },
  { hoy: d.fechaCorte, estado: "vigente" },
  { hoy: "2026-11-15", estado: "vigente" },
  { hoy: "2026-11-16", estado: "sin_edicion", dias: 1 },
  { hoy: "2027-02-23", estado: "sin_edicion", dias: 100 },
];

type Construir = (hoy: string) => {
  vigencia: Vigencia;
  meses: Map<string, number>;
  /** Lo que dice la visita a la sala del primer proyecto (`null` sin edición). */
  visita: VistaVisitaSala["estado"] | null;
};

/** Con la edición vigente se pide; vencida, «mes sin edición»; sin publicar, no hay visita. */
const VISITA: Record<Vigencia["estado"], VistaVisitaSala["estado"] | null> = {
  vigente: "pedir",
  sin_edicion: "sin_edicion",
  sin_publicar: null,
};

/**
 * Lo que el servidor arma en una fecha: la vigencia, la lista, el índice, cada ficha (la espera, en meses), «¿nuevo o
 * usado?» (la espera de lo que cabe, que debe ser la misma de la ficha), «¿te alcanza?» y la visita a la sala.
 */
const real: Construir = (hoy) => {
  const vigencia = edicionVigente([EDICION], hoy);
  vistaLista(publicados, tarifas, { pago: false });
  vistaIndice(publicados, tarifas);
  vistaTeAlcanza(publicados, subsidios, tarifas, {
    tasaEA: 15.48,
    fechaCorte: "2026-10-09",
  });
  const meses = new Map<string, number>();
  for (const p of publicados) {
    const e = vistaProyecto(publicados, p.slug, tarifas, hoy)!.espera;
    if (e.estado === "calculada") meses.set(p.slug, e.meses);
  }
  const comparar = vistaNuevoOUsado(
    publicados,
    USADOS,
    tarifas,
    { zona: "bogota", max: 900_000_000, pago: false },
    { nombre: "anuncios de prueba", fecha: hoy },
    hoy,
  );
  for (const c of comparar.caben) {
    if (c.espera.estado !== "calculada") continue;
    if (meses.get(c.tarjeta.slug) !== c.espera.meses) {
      meses.set(`${c.tarjeta.slug} (¿nuevo o usado?)`, -1);
    }
  }
  const visita =
    vistaVisitaSala(publicados, vigencia, publicados[0].slug)?.estado ?? null;
  return { vigencia, meses, visita };
};

/** El gate: la lista de problemas de una forma de construir la vista a lo largo de la matriz. */
function revisar(construir: Construir): string[] {
  const problemas: string[] = [];
  let anterior: Map<string, number> | null = null;
  for (const m of MATRIZ) {
    let r: ReturnType<Construir>;
    try {
      r = construir(m.hoy);
    } catch (e) {
      problemas.push(`${m.hoy}: lanzó ${String(e)}`);
      continue;
    }
    if (r.vigencia.estado !== m.estado) {
      problemas.push(`${m.hoy}: ${r.vigencia.estado} en vez de ${m.estado}`);
    }
    if (r.visita !== VISITA[m.estado]) {
      problemas.push(
        `${m.hoy}: la visita dice ${r.visita} en vez de ${VISITA[m.estado]}`,
      );
    }
    if (
      m.dias !== undefined &&
      (r.vigencia.estado !== "sin_edicion" || r.vigencia.dias !== m.dias)
    ) {
      problemas.push(`${m.hoy}: no dice que venció hace ${m.dias} días`);
    }
    for (const [slug, n] of r.meses) {
      if (n < 0) problemas.push(`${m.hoy}: ${slug} espera ${n} meses`);
      const antes = anterior?.get(slug);
      if (antes !== undefined && n > antes) {
        problemas.push(`${m.hoy}: la espera de ${slug} creció`);
      }
    }
    anterior = r.meses;
  }
  return problemas;
}

describe("vivienda nueva: matriz de envejecimiento (regla 23)", () => {
  it("la 187 real se construye en cada fecha de la matriz sin un solo problema", () => {
    expect(publicados.length).toBe(143);
    expect(revisar(real)).toEqual([]);
  });

  it("con el paso del tiempo la espera se acorta: a cien días de la vigencia, más fichas dicen que la fecha ya pasó", () => {
    const vencidas = (hoy: string) =>
      publicados.filter((p: ProyectoPublicado) => {
        const e = vistaProyecto(publicados, p.slug, tarifas, hoy)!.espera;
        return e.estado === "calculada" && e.vencida;
      }).length;
    expect(vencidas("2027-02-23")).toBeGreaterThanOrEqual(
      vencidas(d.fechaCorte),
    );
  });

  it("DEMO EN ROJO: una vista que lee el reloj en vez de la fecha que recibe, cae", () => {
    const conReloj: Construir = () => real(hoyBogota(new Date()));
    expect(revisar(conReloj).length).toBeGreaterThan(0);
  });

  it("DEMO EN ROJO: una vista que olvida la vigencia (siempre «vigente»), cae", () => {
    const sinVigencia: Construir = (hoy) => ({
      ...real(hoy),
      vigencia: { estado: "vigente", edicion: EDICION },
    });
    const problemas = revisar(sinVigencia);
    expect(problemas.some((p) => p.startsWith("2026-11-16"))).toBe(true);
    expect(problemas.some((p) => p.startsWith("2026-10-14"))).toBe(true);
  });

  it("DEMO EN ROJO: una visita que se ofrece con la edición vencida, cae", () => {
    const siempre: Construir = (hoy) => ({ ...real(hoy), visita: "pedir" });
    const problemas = revisar(siempre);
    expect(problemas.some((p) => p.startsWith("2026-11-16: la visita"))).toBe(
      true,
    );
    expect(problemas.some((p) => p.startsWith("2027-02-23: la visita"))).toBe(
      true,
    );
  });

  it("DEMO EN ROJO: una espera que crece con el tiempo, cae", () => {
    const alReves: Construir = (hoy) => {
      const r = real(hoy);
      const n = MATRIZ.findIndex((m) => m.hoy === hoy);
      return {
        ...r,
        meses: new Map([...r.meses].map(([k, v]) => [k, v + n])),
      };
    };
    expect(revisar(alReves).some((p) => p.includes("creció"))).toBe(true);
  });
});
