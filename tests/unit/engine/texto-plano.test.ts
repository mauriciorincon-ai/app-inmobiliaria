import { describe, it, expect } from "vitest";
import { textoPlano } from "@/engine/format/texto-plano";
import { cuerpoHtml } from "@/engine/envios/plantillas";

describe("textoPlano: la parte de texto de cada correo", () => {
  it("párrafos, saltos, listas, negritas y entidades", () => {
    expect(
      textoPlano(
        "<p>Hola <strong>Ana</strong> &amp; equipo</p><p>Uno<br>Dos</p><ul><li>a</li><li>b</li></ul>",
      ),
    ).toBe("Hola Ana & equipo\n\nUno\nDos\n\n• a\n• b");
  });

  it("cada enlace queda escrito al lado de su texto", () => {
    expect(
      textoPlano('<p>Abre <a href="https://ejemplo.test/x" style="c">tu anuncio</a>.</p>'),
    ).toBe("Abre tu anuncio (https://ejemplo.test/x).");
    expect(textoPlano('<a href="https://ejemplo.test/y">https://ejemplo.test/y</a>')).toBe(
      "https://ejemplo.test/y",
    );
  });

  it("una plantilla real no deja etiquetas ni pierde su enlace", () => {
    const html = cuerpoHtml("completa-anuncio", "es", "Ana", "https://ejemplo.test");
    const texto = textoPlano(html);
    expect(texto).not.toMatch(/<[^>]+>/);
    expect(texto).toContain("https://ejemplo.test");
  });
});
