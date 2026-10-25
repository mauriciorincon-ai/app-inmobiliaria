// @vitest-environment node
import { describe, expect, it } from "vitest";
import { lectorCtlActivo } from "@/lib/ctl-activo";

// S15 — el lector de CTL nace APAGADO: solo «1» lo enciende; ausente, vacío o cualquier otro valor lo deja apagado.
describe("el interruptor del lector de CTL", () => {
  it("ausente ⇒ apagado", () => {
    expect(lectorCtlActivo({})).toBe(false);
  });
  it.each(["", "0", "true", "si", "on", " 1"])("«%s» ⇒ apagado", (v) => {
    expect(lectorCtlActivo({ LECTOR_CTL_ACTIVO: v })).toBe(false);
  });
  it("«1» ⇒ encendido", () => {
    expect(lectorCtlActivo({ LECTOR_CTL_ACTIVO: "1" })).toBe(true);
  });
});
