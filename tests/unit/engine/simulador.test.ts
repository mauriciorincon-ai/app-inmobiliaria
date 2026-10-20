import { describe, it, expect } from "vitest";
import {
  FINANCIABLE_MAX,
  TOPE_CUOTA_INGRESO,
  creditoParaCuota,
  cuotaFija,
  precioMaximo,
  simular,
  tasaMensual,
} from "@/engine/simulador/cuota";
import {
  DIAS_TASA_VIEJA,
  FUENTE_TASA,
  TASA_RESPALDO,
  elegirTasa,
  parsearTasa,
  urlConsultaTasa,
} from "@/engine/simulador/tasa";
import { SIMULADOR } from "@/textos/simulador";
import {
  CLAVE_CAPACIDAD,
  leerCapacidad,
  serializarCapacidad,
} from "@/engine/simulador/capacidad-local";

// Simulador de cuota y capacidad (S10, ADR 018). «Un cálculo, no una aprobación».

describe("las normas (verificadas en la fuente primaria)", () => {
  it("tope de la primera cuota 40 % (Decreto 583 de 2025) y financiable 70 %", () => {
    expect(TOPE_CUOTA_INGRESO).toBe(0.4);
    expect(FINANCIABLE_MAX).toBe(0.7);
    expect(SIMULADOR.normas.cuota.es).toContain("Decreto 583 de 2025");
    expect(SIMULADOR.normas.cuota.en).toContain("Decreto 583 de 2025");
  });
});

describe("cuota contra un caso calculado a mano", () => {
  // Precio 300 M, cuota inicial 30 % ⇒ crédito 210 M; 20 años ⇒ 240 meses; tasa 15,48 % EA.
  //   i = 1,1548^(1/12) − 1 = 0,0120661463486712…
  //   (1 + i)^240 = 1,1548^20 = 17,7883433736948…
  //   cuota = 210 000 000 × i × 17,78834 / (17,78834 − 1) = 2 684 822,2859548… ⇒ $2 684 822
  //   total pagado = cuota × 240 = 644 357 349; ingreso para que la cuota sea el 40 % = cuota / 0,4 = 6 712 056
  // (hecho con aritmética decimal de 40 dígitos, no con este código).
  const caso = {
    precio: 300_000_000,
    inicial: 0.3,
    plazoAnos: 20,
    tasaEA: 15.48,
  };

  it("tasa mensual equivalente", () => {
    expect(tasaMensual(15.48)).toBeCloseTo(0.0120661463486712, 14);
  });

  it("cuota, cuota inicial, crédito, total pagado e ingreso necesario", () => {
    const r = simular({ ...caso, ingresos: null });
    expect(r).toEqual({
      estado: "sin_ingresos",
      cuota: 2_684_822,
      cuotaInicial: 90_000_000,
      credito: 210_000_000,
      totalPagado: 644_357_349,
      ingresoNecesario: 6_712_056,
      porcentajeIngreso: null,
      excedeFinanciable: false,
    });
  });

  it("con ingresos de 8 M la cuota es el 33,6 % ⇒ cabe", () => {
    expect(simular({ ...caso, ingresos: 8_000_000 })).toMatchObject({
      estado: "cabe",
      porcentajeIngreso: 33.6,
    });
  });

  it("el borde del 40 %: 6 712 056 cabe, 6 712 055 no cabe", () => {
    expect(simular({ ...caso, ingresos: 6_712_056 }).estado).toBe("cabe");
    expect(simular({ ...caso, ingresos: 6_712_055 }).estado).toBe("no_cabe");
  });
});

describe("simular — estados", () => {
  const base = {
    precio: 300_000_000,
    inicial: 0.3,
    plazoAnos: 20,
    tasaEA: 15.48,
    ingresos: 8_000_000,
  };

  it("sin tasa (ni de referencia ni escrita) ⇒ sin_tasa", () => {
    expect(simular({ ...base, tasaEA: null }).estado).toBe("sin_tasa");
    expect(simular({ ...base, tasaEA: 0 }).estado).toBe("sin_tasa");
    expect(simular({ ...base, tasaEA: 61 }).estado).toBe("sin_tasa");
  });

  it("entradas imposibles ⇒ invalido", () => {
    for (const malo of [
      { precio: 0 },
      { inicial: 1 },
      { inicial: -0.1 },
      { plazoAnos: 4 },
      { plazoAnos: 31 },
      { plazoAnos: 12.5 },
      { ingresos: 0 },
    ]) {
      expect(simular({ ...base, ...malo }).estado, JSON.stringify(malo)).toBe(
        "invalido",
      );
    }
  });

  it("una cuota inicial menor al 30 % excede el financiable del 70 %", () => {
    expect(simular({ ...base, inicial: 0.2 })).toMatchObject({
      excedeFinanciable: true,
    });
    expect(simular({ ...base, inicial: 0.3 })).toMatchObject({
      excedeFinanciable: false,
    });
  });

  it("a más plazo, menor cuota", () => {
    const a = simular({ ...base, plazoAnos: 15 });
    const b = simular({ ...base, plazoAnos: 30 });
    if (a.estado === "cabe" || a.estado === "no_cabe") {
      if (b.estado === "cabe" || b.estado === "no_cabe")
        expect(b.cuota).toBeLessThan(a.cuota);
    }
  });
});

describe("cuotaFija y creditoParaCuota", () => {
  it("con tasa 0, capital entre meses", () => {
    expect(cuotaFija(120_000, 0, 12)).toBe(10_000);
    expect(creditoParaCuota(10_000, 0, 12)).toBe(120_000);
  });

  it("son inversas", () => {
    const i = tasaMensual(14);
    expect(
      creditoParaCuota(cuotaFija(150_000_000, i, 180), i, 180),
    ).toBeCloseTo(150_000_000, 3);
  });
});

describe("precioMaximo — el único número que sale del teléfono", () => {
  it("con 8 M de ingresos, 30 % inicial, 20 años y 15,48 %: la cuota queda en el 40 %", () => {
    const p = precioMaximo(8_000_000, 0.3, 20, 15.48);
    expect(p).toBe(357_565_565);
    const r = simular({
      precio: p!,
      inicial: 0.3,
      plazoAnos: 20,
      tasaEA: 15.48,
      ingresos: 8_000_000,
    });
    expect(r.estado).toBe("cabe");
    if (r.estado === "cabe") expect(r.porcentajeIngreso).toBeCloseTo(40, 1);
  });

  it("con menos del 30 % de cuota inicial el banco financia solo el 70 %: el mismo máximo", () => {
    expect(precioMaximo(8_000_000, 0.2, 20, 15.48)).toBe(357_565_565);
  });

  it("con más cuota inicial, más precio", () => {
    expect(precioMaximo(8_000_000, 0.5, 20, 15.48)).toBe(500_591_792);
  });

  it("null si falta algo", () => {
    expect(precioMaximo(null, 0.3, 20, 15.48)).toBeNull();
    expect(precioMaximo(8_000_000, 0.3, 20, null)).toBeNull();
    expect(precioMaximo(0, 0.3, 20, 15.48)).toBeNull();
    expect(precioMaximo(8_000_000, 1, 20, 15.48)).toBeNull();
    expect(precioMaximo(8_000_000, 0.3, 3, 15.48)).toBeNull();
  });
});

describe("la tasa de la Superfinanciera", () => {
  it("una sola consulta agregada: producto no VIS en pesos, tasa fija, ponderada por monto, la última semana", () => {
    const u = new URL(urlConsultaTasa());
    expect(u.origin + u.pathname).toBe(
      "https://www.datos.gov.co/resource/qzsc-9esp.json",
    );
    expect(u.searchParams.get("$where")).toBe(
      "producto_de_cr_dito='Adquisición de vivienda no vis (colocación en pesos)' AND tipo_de_tasa='FS'",
    );
    expect(u.searchParams.get("$select")).toContain(
      "sum(tasa_efectiva_promedio * montos_desembolsados) / sum(montos_desembolsados)",
    );
    expect(u.searchParams.get("$order")).toBe("fecha_corte DESC");
    expect(u.searchParams.get("$limit")).toBe("1");
  });

  it("valida la respuesta real del conjunto (textos) y redondea a 3 decimales", () => {
    const t = parsearTasa([
      {
        fecha_corte: "2026-10-09T00:00:00.000",
        tasa: "15.4801495470544664",
        creditos: "686",
        entidades: "13",
      },
    ]);
    expect(t).toEqual({
      fechaCorte: "2026-10-09",
      tasaEA: 15.48,
      creditos: 686,
      entidades: 13,
      fuente: FUENTE_TASA,
    });
  });

  it("acepta números y rechaza lo vacío, lo malformado y lo imposible", () => {
    expect(
      parsearTasa([
        {
          fecha_corte: "2026-10-02",
          tasa: 15.3765,
          creditos: 1323,
          entidades: 14,
        },
      ]),
    ).toMatchObject({
      tasaEA: 15.377,
    });
    for (const malo of [
      [],
      null,
      {},
      "texto",
      [{ fecha_corte: "2026-10-09" }],
      [{ fecha_corte: "ayer", tasa: "15", creditos: "1", entidades: "1" }],
      [
        {
          fecha_corte: "2026-13-45",
          tasa: "15",
          creditos: "1",
          entidades: "1",
        },
      ],
      [
        {
          fecha_corte: "2026-10-09",
          tasa: "0.5",
          creditos: "1",
          entidades: "1",
        },
      ],
      [
        {
          fecha_corte: "2026-10-09",
          tasa: "61",
          creditos: "1",
          entidades: "1",
        },
      ],
      [
        {
          fecha_corte: "2026-10-09",
          tasa: "15",
          creditos: "0",
          entidades: "1",
        },
      ],
      [
        {
          fecha_corte: "2026-10-09",
          tasa: "15",
          creditos: "1",
          entidades: "0",
        },
      ],
      [
        {
          fecha_corte: "2026-10-09",
          tasa: "abc",
          creditos: "1",
          entidades: "1",
        },
      ],
    ]) {
      expect(parsearTasa(malo), JSON.stringify(malo)).toBeNull();
    }
  });

  it("elige la guardada con su antigüedad; sin guardada, la del repo con SU fecha (nunca como de hoy)", () => {
    const guardada = {
      ...TASA_RESPALDO,
      fechaCorte: "2026-10-16",
      tasaEA: 15.5,
    };
    expect(elegirTasa(guardada, "2026-10-19")).toMatchObject({
      origen: "guardada",
      tasaEA: 15.5,
      diasDesdeCorte: 3,
      vieja: false,
    });
    expect(elegirTasa(null, "2026-10-19")).toMatchObject({
      origen: "respaldo",
      fechaCorte: "2026-10-09",
      tasaEA: 15.48,
      diasDesdeCorte: 10,
      vieja: false,
    });
  });

  it(`más de ${DIAS_TASA_VIEJA} días desde el corte ⇒ vieja`, () => {
    expect(elegirTasa(null, "2026-11-08").vieja).toBe(false); // 30 días
    expect(elegirTasa(null, "2026-11-09").vieja).toBe(true); // 31 días
  });

  it("la tasa del repo trae fecha, fuente y cifras de la misma consulta", () => {
    expect(TASA_RESPALDO).toMatchObject({
      fechaCorte: "2026-10-09",
      creditos: 686,
      entidades: 13,
    });
    expect(TASA_RESPALDO.fuente).toBe(FUENTE_TASA);
    expect(SIMULADOR.fuentes.tasa.es).toContain("Superintendencia Financiera");
  });
});

describe("lo que puedes pagar, guardado solo en el teléfono", () => {
  const c = { ingresos: 8_000_000, inicial: 0.3, plazoAnos: 20, tasaEA: null };

  it("ida y vuelta por localStorage", () => {
    expect(CLAVE_CAPACIDAD).toBe("inn:capacidad:v1");
    expect(leerCapacidad(serializarCapacidad(c))).toEqual(c);
    expect(leerCapacidad(serializarCapacidad({ ...c, tasaEA: 14.2 }))).toEqual({
      ...c,
      tasaEA: 14.2,
    });
  });

  it("lo roto o fuera de rango se descarta sin lanzar", () => {
    for (const malo of [
      null,
      "",
      "{",
      "[]",
      JSON.stringify({ ...c, ingresos: -1 }),
      JSON.stringify({ ...c, inicial: 1 }),
      JSON.stringify({ ...c, plazoAnos: 40 }),
      JSON.stringify({ ...c, tasaEA: 99 }),
      JSON.stringify({ ingresos: 1 }),
    ]) {
      expect(leerCapacidad(malo), String(malo)).toBeNull();
    }
  });

  it("no serializa un valor inválido", () => {
    expect(() => serializarCapacidad({ ...c, plazoAnos: 2 })).toThrow();
  });
});
