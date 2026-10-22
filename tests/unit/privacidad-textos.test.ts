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

// S13: dos textos que dicen lo que el código hace con los números del comprador y con la visita a una sala de ventas.
describe("/privacidad — el teléfono y la sala de ventas (es/en)", () => {
  const TELEFONO = PRIVACIDAD.telefono.texto;
  const SALAS = PRIVACIDAD.visitas.salas;

  it("tienen las dos redacciones, con contenido, y distintas entre sí", () => {
    for (const t of [TELEFONO, SALAS, PRIVACIDAD.telefono.titulo]) {
      expect(Object.keys(t).sort()).toEqual(["en", "es"]);
      expect(t.es.trim().length).toBeGreaterThan(15);
      expect(t.en.trim().length).toBeGreaterThan(15);
      expect(t.en).not.toBe(t.es);
    }
  });

  it("el teléfono dice que los ingresos y el arriendo no se envían ni se guardan, y que solo viaja el precio máximo", () => {
    const es = TELEFONO.es.toLowerCase();
    const en = TELEFONO.en.toLowerCase();
    for (const [e, i] of [
      ["ingresos", "income"],
      ["arriendo", "rent"],
      ["no los enviamos", "neither receive nor keep"],
      ["precio máximo", "maximum price"],
      ["no revela tus ingresos", "does not reveal your income"],
    ]) {
      expect(es, e).toContain(e);
      expect(en, i).toContain(i);
    }
  });

  it("la sala dice quién la coordina, que el equipo escribe a mano, que no entrega tus datos y que los contactos no se publican", () => {
    const es = SALAS.es.toLowerCase();
    const en = SALAS.en.toLowerCase();
    for (const [e, i] of [
      ["equipo de innmobiliaria", "innmobiliaria team"],
      [
        "sin darle tu nombre ni tu número",
        "without giving it your name or your number",
      ],
      ["a mano por whatsapp", "by hand on whatsapp"],
      ["nunca se publican", "never published"],
    ]) {
      expect(es, e).toContain(e);
      expect(en, i).toContain(i);
    }
  });

  it("no queda la frase caducada «Innmobiliaria no te envía mensajes por WhatsApp» en la visita", () => {
    expect(PRIVACIDAD.visitas.texto.es).not.toContain(
      "Innmobiliaria no te envía mensajes por WhatsApp",
    );
    expect(PRIVACIDAD.visitas.texto.en).not.toContain(
      "Innmobiliaria does not message you on WhatsApp",
    );
  });
});
