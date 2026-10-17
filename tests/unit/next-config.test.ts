import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from "next/constants";
import config from "../../next.config";

// Demo en rojo (regla 15) del guard del correo del responsable: el build de PRODUCCIÓN debe fallar sin
// la variable, para que jamás se publique una política de privacidad sin contacto. Nació mal una vez
// (S4): leía process.env.NEXT_PHASE al cargar la config, y Next la fija DESPUÉS, así que nunca
// disparaba. Esta prueba fija la forma correcta: la fase llega como argumento de la función.
const VAR = "NEXT_PUBLIC_RESPONSABLE_CORREO";

describe("next.config — guard del correo del responsable (Ley 1581)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("el build de producción FALLA sin la variable", () => {
    vi.stubEnv(VAR, "");
    expect(() => config(PHASE_PRODUCTION_BUILD)).toThrow(VAR);
  });

  it("el build de producción FALLA con la variable en blanco", () => {
    vi.stubEnv(VAR, "   ");
    expect(() => config(PHASE_PRODUCTION_BUILD)).toThrow(VAR);
  });

  it("el build de producción pasa con la variable puesta", () => {
    vi.stubEnv(VAR, "responsable@ejemplo.test");
    expect(config(PHASE_PRODUCTION_BUILD)).toBeTruthy();
  });

  it("desarrollo y `next start` no exigen la variable", () => {
    vi.stubEnv(VAR, "");
    expect(config(PHASE_DEVELOPMENT_SERVER)).toBeTruthy();
    expect(config(PHASE_PRODUCTION_SERVER)).toBeTruthy();
  });
});
