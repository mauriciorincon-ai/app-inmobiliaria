import { describe, it, expect } from "vitest";
import {
  PLANTILLAS,
  agruparPorIdioma,
  asuntoDe,
  cuerpoHtml,
  escaparHtml,
  etiquetaDe,
  plantillaPorId,
} from "@/engine/envios/plantillas";
import { IDIOMAS } from "@/i18n/idiomas";

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

  it.each(IDIOMAS)(
    "[%s] los cuerpos llevan el link de la app y el saludo con nombre",
    (idioma) => {
      for (const p of PLANTILLAS) {
        const html = cuerpoHtml(p.id, idioma, "Ana", "https://innmob.co");
        expect(html).toContain("https://innmob.co");
        expect(html).toContain("Ana");
      }
    },
  );

  it("el saludo sin nombre no rompe, en cada idioma", () => {
    expect(cuerpoHtml("completa-anuncio", "es", "", "u")).toContain("<p>Hola,");
    expect(cuerpoHtml("completa-anuncio", "es", "   ", "u")).toContain(
      "<p>Hola,",
    );
    expect(cuerpoHtml("completa-anuncio", "en", "", "u")).toContain("<p>Hi,");
  });

  it("cada idioma sale redactado en su idioma, con asunto y etiqueta propios", () => {
    for (const p of PLANTILLAS) {
      expect(asuntoDe(p.id, "es")).not.toBe(asuntoDe(p.id, "en"));
      expect(etiquetaDe(p.id, "es")).not.toBe(etiquetaDe(p.id, "en"));
      expect(cuerpoHtml(p.id, "en", "X", "u")).not.toMatch(
        /Hola|Renueva|Completar|Saca tu/,
      );
      expect(cuerpoHtml(p.id, "es", "X", "u")).not.toMatch(
        /Hi X|Renew|Complete my|Get your/,
      );
    }
  });

  it("SOLO cifras citables — nunca evidencia débil ni fabricada", () => {
    const todo = IDIOMAS.flatMap((i) =>
      PLANTILLAS.map((p) => asuntoDe(p.id, i) + cuerpoHtml(p.id, i, "X", "u")),
    ).join(" ");
    // Las citables canónicas están, en cada idioma:
    expect(todo).toMatch(/89 días|\$23\.000|7 a 7,5 meses/);
    expect(todo).toMatch(/89 days|COP 23,000|7 to 7\.5 months/);
    // Las prohibidas (evidencia débil / fabricadas) JAMÁS:
    expect(todo).not.toMatch(
      /3×|118%|32% más|Matterport|9% mayor|\+118|Camacol/,
    );
  });

  it("explica el término local en inglés: el CTL se nombra y se define", () => {
    const html = cuerpoHtml("gana-sello", "en", "X", "u");
    expect(html).toContain("Certificado de Tradición y Libertad");
    expect(html).toMatch(/CTL, the official record of who owns a property/);
  });
});

describe("el nombre del vendedor es texto del usuario: se escapa", () => {
  const ataque = `<img src=x onerror="alert(1)">&"'`;

  it.each(IDIOMAS)(
    "[%s] ninguna etiqueta del nombre llega al HTML",
    (idioma) => {
      for (const p of PLANTILLAS) {
        const html = cuerpoHtml(p.id, idioma, ataque, "https://innmob.co");
        expect(html).not.toContain("<img");
        expect(html).not.toContain('onerror="');
        expect(html).toContain(
          "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
        );
      }
    },
  );

  it("la URL también se escapa: no puede cerrar el atributo href", () => {
    const html = cuerpoHtml(
      "gana-sello",
      "es",
      "Ana",
      'https://x.test/" onmouseover="alert(1)',
    );
    expect(html).not.toContain('" onmouseover="');
    expect(html).toContain("&quot; onmouseover=&quot;");
  });

  it("escaparHtml cubre los cinco caracteres", () => {
    expect(escaparHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});

describe("agruparPorIdioma", () => {
  it("reparte por idioma y deja vacío el que no tiene destinatarios", () => {
    const lista = [
      { email: "a", idioma: "es" as const },
      { email: "b", idioma: "en" as const },
      { email: "c", idioma: "es" as const },
    ];
    const g = agruparPorIdioma(lista);
    expect(g.es.map((x) => x.email)).toEqual(["a", "c"]);
    expect(g.en.map((x) => x.email)).toEqual(["b"]);
    expect(agruparPorIdioma([]).en).toEqual([]);
  });
});
