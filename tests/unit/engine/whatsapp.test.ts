import { describe, expect, it } from "vitest";
import {
  esWhatsappValido,
  normalizarWhatsapp,
  construirWaMe,
  mensajeReContacto,
} from "@/engine/format/whatsapp";

describe("normalizarWhatsapp", () => {
  it("normaliza 10 dígitos locales a E.164", () => {
    expect(normalizarWhatsapp("3001234567")).toBe("+573001234567");
  });

  it("acepta espacios, guiones y paréntesis", () => {
    expect(normalizarWhatsapp("300 123 4567")).toBe("+573001234567");
    expect(normalizarWhatsapp("300-123-4567")).toBe("+573001234567");
    expect(normalizarWhatsapp("(300) 123 4567")).toBe("+573001234567");
  });

  it("acepta el indicativo país 57 y el prefijo +57", () => {
    expect(normalizarWhatsapp("573001234567")).toBe("+573001234567");
    expect(normalizarWhatsapp("+57 300 123 4567")).toBe("+573001234567");
  });

  it("acepta la salida internacional 0057", () => {
    expect(normalizarWhatsapp("00573001234567")).toBe("+573001234567");
  });

  it("rechaza celulares que no empiezan por 3", () => {
    expect(normalizarWhatsapp("1001234567")).toBeNull();
    expect(normalizarWhatsapp("571001234567")).toBeNull();
  });

  it("rechaza longitudes incorrectas", () => {
    expect(normalizarWhatsapp("300123456")).toBeNull(); // 9 dígitos
    expect(normalizarWhatsapp("30012345678")).toBeNull(); // 11 dígitos
    expect(normalizarWhatsapp("")).toBeNull();
  });

  it("rechaza entradas no-string", () => {
    // @ts-expect-error validación de robustez en runtime
    expect(normalizarWhatsapp(null)).toBeNull();
    // @ts-expect-error validación de robustez en runtime
    expect(normalizarWhatsapp(3001234567)).toBeNull();
  });
});

describe("esWhatsappValido", () => {
  it("es true para números normalizables y false si no", () => {
    expect(esWhatsappValido("3001234567")).toBe(true);
    expect(esWhatsappValido("abc")).toBe(false);
  });
});

describe("construirWaMe", () => {
  it("arma wa.me solo con dígitos (sin +) y el texto codificado", () => {
    const url = construirWaMe("+573001234567", "Hola, ¿cómo estás?");
    expect(url).toBe(
      "https://wa.me/573001234567?text=Hola%2C%20%C2%BF" +
        encodeURIComponent("cómo estás?"),
    );
  });

  it("normaliza formas locales antes de construir el enlace", () => {
    expect(construirWaMe("300 123 4567", "hola")).toBe(
      "https://wa.me/573001234567?text=hola",
    );
  });
});

describe("mensajeReContacto", () => {
  it("usa el primer nombre e incluye el link", () => {
    const link = "https://innmobiliaria.co/mi-anuncio#t=xyz";
    const msg = mensajeReContacto("Ana María Vélez", link);
    expect(msg).toMatch(/^Hola Ana,/);
    expect(msg).toContain(link);
  });

  it("no menciona cifras y degrada con nombre vacío", () => {
    const msg = mensajeReContacto("   ", "https://x/mi-anuncio#t=z");
    expect(msg).toContain("Hola hola");
    expect(msg).not.toMatch(/\d+%/);
  });
});
