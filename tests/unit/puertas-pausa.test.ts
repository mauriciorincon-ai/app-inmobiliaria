// @vitest-environment node
// La demo en rojo (regla 15) del gate de la pausa: catálogos sintéticos. El catálogo REAL lo revisa
// `tests/e2e/antifraude-bd.spec.ts` contra la base migrada.
import { describe, expect, it } from "vitest";
import {
  DELEGAN,
  RESPETAN_PAUSA,
  problemasDePausa,
  type FuncionCatalogo,
} from "../e2e/utils/puertas-pausa";

const sano = (): FuncionCatalogo[] => [
  ...RESPETAN_PAUSA.map((nombre) => ({
    nombre,
    cuerpo: "select 1 from public.inmuebles i where i.pausado_at is null",
  })),
  ...DELEGAN.map((nombre) => ({
    nombre,
    cuerpo: "select public.inmuebles_que_cumplen(null, null, null, null, null, null, null)",
  })),
  { nombre: "obtener_mi_anuncio", cuerpo: "select * from public.inmuebles" },
];

describe("el gate de la pausa", () => {
  it("un catálogo clasificado no tiene problemas", () => {
    expect(problemasDePausa(sano())).toEqual([]);
  });

  it("cae si una función que muestra anuncios olvida la pausa", () => {
    const c = sano().map((f) =>
      f.nombre === "obtener_ficha"
        ? { ...f, cuerpo: "select * from public.inmuebles where slug = p_slug" }
        : f,
    );
    expect(problemasDePausa(c)).toEqual(["obtener_ficha: debe mirar pausado_at"]);
  });

  it("cae si una función nueva lee inmuebles sin estar clasificada", () => {
    const c = [...sano(), { nombre: "mostrar_destacados", cuerpo: "from public.inmuebles" }];
    expect(problemasDePausa(c)).toEqual([
      "mostrar_destacados: lee inmuebles y no está clasificada",
    ]);
  });

  it("cae si una que delega deja de filtrar por inmuebles_que_cumplen, o si una de la lista desaparece", () => {
    const c = sano()
      .filter((f) => f.nombre !== "mis_listas")
      .map((f) =>
        f.nombre === "buscar_inmuebles" ? { ...f, cuerpo: "from public.inmuebles" } : f,
      );
    expect(problemasDePausa(c)).toEqual([
      "buscar_inmuebles: debe filtrar por inmuebles_que_cumplen",
      "mis_listas: ya no existe (la lista quedó desfasada)",
    ]);
  });
});
