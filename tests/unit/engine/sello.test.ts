import { describe, it, expect } from "vitest";
import {
  CTL_MAX_DIAS,
  ctlFechaMinima,
  ctlVigenteParaRegistrar,
  diasDesdeCtl,
  estadoSello,
  hoyEnBogota,
} from "@/engine/sello/sello";

describe("estadoSello — tres estados, sin reloj", () => {
  it("sin verificar ⇒ fundador (aunque llegara una fecha suelta)", () => {
    expect(estadoSello("fundador", null)).toBe("fundador");
    expect(estadoSello("fundador", "2026-10-01")).toBe("fundador");
  });
  it("verificado con fecha del CTL ⇒ verificado", () => {
    expect(estadoSello("verificado", "2026-10-01")).toBe("verificado");
  });
  it("verificado SIN fecha ⇒ re-verificación pendiente (la fecha no se inventa)", () => {
    expect(estadoSello("verificado", null)).toBe("reverificacion_pendiente");
  });
});

describe("ctlVigenteParaRegistrar — hoy−30 ≤ fecha ≤ hoy", () => {
  const HOY = "2026-10-17";
  it("el límite es de 30 días", () => {
    expect(CTL_MAX_DIAS).toBe(30);
  });
  it("acepta hoy y hace 30 días", () => {
    expect(ctlVigenteParaRegistrar("2026-10-17", HOY)).toEqual({
      ok: true,
      dias: 0,
    });
    expect(ctlVigenteParaRegistrar("2026-09-17", HOY)).toEqual({
      ok: true,
      dias: 30,
    });
  });
  it("rechaza hace 31 días (vencida) y mañana (futura)", () => {
    expect(ctlVigenteParaRegistrar("2026-09-16", HOY)).toEqual({
      ok: false,
      motivo: "vencida",
    });
    expect(ctlVigenteParaRegistrar("2026-10-18", HOY)).toEqual({
      ok: false,
      motivo: "futura",
    });
  });
  it("rechaza fechas que no existen o mal escritas", () => {
    for (const mala of ["", "17/10/2026", "2026-02-31", "2026-13-01", "hoy"]) {
      expect(ctlVigenteParaRegistrar(mala, HOY), mala).toEqual({
        ok: false,
        motivo: "invalida",
      });
    }
    expect(ctlVigenteParaRegistrar("2026-10-01", "ayer")).toEqual({
      ok: false,
      motivo: "invalida",
    });
  });
});

describe("ctlFechaMinima", () => {
  it("es hoy menos 30 días (cruza el mes) y vacía si hoy no es válida", () => {
    expect(ctlFechaMinima("2026-10-17")).toBe("2026-09-17");
    expect(ctlFechaMinima("2026-03-05")).toBe("2026-02-03");
    expect(ctlFechaMinima("ayer")).toBe("");
  });
});

describe("hoyEnBogota y diasDesdeCtl", () => {
  it("usa UTC−5: a la 01:00 UTC todavía es el día anterior en Bogotá", () => {
    expect(hoyEnBogota(new Date("2026-10-18T01:00:00Z"))).toBe("2026-10-17");
    expect(hoyEnBogota(new Date("2026-10-18T05:00:00Z"))).toBe("2026-10-18");
  });
  it("cuenta los días desde el CTL", () => {
    expect(diasDesdeCtl("2026-10-10", "2026-10-17")).toBe(7);
    expect(diasDesdeCtl("2026-10-17", "2026-10-17")).toBe(0);
    expect(diasDesdeCtl("basura", "2026-10-17")).toBeNull();
  });
});
