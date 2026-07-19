import { describe, it, expect } from "vitest";
import { PLANTILLAS, plantillaPorId } from "@/engine/envios/plantillas";

describe("plantillas de envío (deterministas, cifras citables)", () => {
  it("hay 3 plantillas, una por filtro", () => {
    expect(PLANTILLAS).toHaveLength(3);
    expect(PLANTILLAS.map((p) => p.filtroSugerido).sort()).toEqual([
      "por-vencer",
      "sin-fotos",
      "sin-sello",
    ]);
  });

  it("plantillaPorId encuentra y devuelve null si no existe", () => {
    expect(plantillaPorId("completa-anuncio")?.id).toBe("completa-anuncio");
    expect(plantillaPorId("no-existe")).toBeNull();
  });

  it("los cuerpos llevan el link de la app y el saludo con nombre", () => {
    for (const p of PLANTILLAS) {
      const html = p.cuerpoHtml("Ana", "https://innmob.co");
      expect(html).toContain("https://innmob.co");
      expect(html).toContain("Ana");
    }
  });

  it("el saludo sin nombre no rompe", () => {
    expect(PLANTILLAS[0].cuerpoHtml("", "u")).toContain("Hola");
    expect(PLANTILLAS[0].cuerpoHtml("   ", "u")).toContain("Hola");
  });

  it("SOLO cifras citables — nunca evidencia débil ni fabricada", () => {
    const todo = PLANTILLAS.map((p) => p.asunto + p.cuerpoHtml("X", "u")).join(
      " ",
    );
    // Alguna citable canónica está presente:
    expect(todo).toMatch(/89 días|123|\$23\.000|7 a 7,5 meses/);
    // Las prohibidas (evidencia débil / fabricadas) JAMÁS:
    expect(todo).not.toMatch(/3×|118%|32% más|Matterport|9% mayor|\+118/);
  });
});
