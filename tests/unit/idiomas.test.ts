import { describe, expect, it } from "vitest";
import { cookieDeIdioma, esIdioma, langHtml, localeIntl } from "@/i18n/idiomas";

describe("cookieDeIdioma", () => {
  it("dura un año, vale para todo el sitio y es SameSite=Lax", () => {
    expect(cookieDeIdioma("en")).toBe(
      "idioma=en; Path=/; Max-Age=31536000; SameSite=Lax",
    );
  });

  it("bajo HTTPS añade Secure; en http (desarrollo) no", () => {
    expect(cookieDeIdioma("es", true)).toMatch(/; Secure$/);
    expect(cookieDeIdioma("es", false)).not.toContain("Secure");
  });
});

describe("idiomas válidos", () => {
  it("solo es y en; el atributo lang del español es el de Colombia", () => {
    expect(esIdioma("es")).toBe(true);
    expect(esIdioma("en")).toBe(true);
    expect(esIdioma("fr")).toBe(false);
    expect(esIdioma(null)).toBe(false);
    expect(langHtml("es")).toBe("es-CO");
    expect(langHtml("en")).toBe("en");
    expect(localeIntl("en")).toBe("en-US");
  });
});
