import { describe, expect, it } from "vitest";
import { PRIVACIDAD } from "@/textos/privacidad";

const CORREO_OPCIONAL = PRIVACIDAD.datos.correoOpcional;

// Regla de producto 10: el texto nuevo nace como mapa { es, en } con paridad. Un solo mapa tiene
// pocas claves que comparar, así que la paridad exige las dos, con contenido, y distintas entre sí
// (una copia del español no es una redacción en inglés).
describe("/privacidad — texto del correo opcional (es/en)", () => {
  it("tiene exactamente las claves es y en", () => {
    expect(Object.keys(CORREO_OPCIONAL).sort()).toEqual(["en", "es"]);
  });

  it("las dos redacciones tienen contenido y no son la misma cadena", () => {
    expect(CORREO_OPCIONAL.es.trim().length).toBeGreaterThan(80);
    expect(CORREO_OPCIONAL.en.trim().length).toBeGreaterThan(80);
    expect(CORREO_OPCIONAL.en).not.toBe(CORREO_OPCIONAL.es);
  });

  it("las dos dicen lo mismo en lo que importa: opcional, solo avisos, WhatsApp, encargado y baja", () => {
    const es = CORREO_OPCIONAL.es.toLowerCase();
    const en = CORREO_OPCIONAL.en.toLowerCase();
    for (const [e, i] of [
      ["opcional", "optional"],
      ["whatsapp", "whatsapp"],
      ["encargo", "on our behalf"],
      ["borremos", "delete"],
    ]) {
      expect(es, e).toContain(e);
      expect(en, i).toContain(i);
    }
  });

  it("no promete el paquete fundador por correo (se sirve como enlaces, ADR 010)", () => {
    expect(CORREO_OPCIONAL.es.toLowerCase()).not.toContain("paquete");
    expect(CORREO_OPCIONAL.en.toLowerCase()).not.toContain("package");
  });
});
