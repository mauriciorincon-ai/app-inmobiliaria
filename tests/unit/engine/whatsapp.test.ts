import { describe, expect, it } from "vitest";
import { esWhatsappValido, normalizarWhatsapp } from "@/engine/format/whatsapp";

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
