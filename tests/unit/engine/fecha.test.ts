import { describe, it, expect } from "vitest";
import { formatearFecha } from "@/engine/format/fecha";

describe("formatearFecha", () => {
  it("escribe el día en cada idioma", () => {
    expect(formatearFecha("2026-10-03", "es")).toBe("3 oct 2026");
    expect(formatearFecha("2026-10-03", "en")).toBe("Oct 3, 2026");
  });
  it("no corre el día por la zona horaria (la fecha es un día, no un instante)", () => {
    expect(formatearFecha("2026-01-01", "es")).toBe("1 ene 2026");
    expect(formatearFecha("2026-12-31", "en")).toBe("Dec 31, 2026");
  });
  it("acepta un ISO completo y devuelve vacío si no es fecha", () => {
    expect(formatearFecha("2026-10-03T15:00:00Z", "es")).toBe("3 oct 2026");
    expect(formatearFecha("no-es-fecha", "es")).toBe("");
  });
});
