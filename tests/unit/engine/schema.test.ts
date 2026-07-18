import { describe, expect, it } from "vitest";
import {
  construirPayload,
  paso1Schema,
  paso2Schema,
  paso3Schema,
  registroSchema,
  type DatosRegistro,
} from "@/engine/registro/schema";

const paso1Valido = {
  nombre: "Ana Gómez",
  whatsapp: "300 123 4567",
  ciudad: "Bogotá",
};
const paso2Valido = {
  operacion: "venta",
  tipo: "apartamento",
  barrio: "Cedritos",
  direccion_aproximada: "Calle 140 aprox.",
  area_m2: "78",
  habitaciones: "3",
  precio_esperado: "420.000.000",
};

describe("paso1Schema (contacto)", () => {
  it("acepta un contacto válido", () => {
    expect(paso1Schema.safeParse(paso1Valido).success).toBe(true);
  });

  it("rechaza nombre corto y WhatsApp inválido", () => {
    const r = paso1Schema.safeParse({
      nombre: "A",
      whatsapp: "123",
      ciudad: "Bogotá",
    });
    expect(r.success).toBe(false);
  });
});

describe("paso2Schema (inmueble)", () => {
  it("acepta un inmueble válido", () => {
    expect(paso2Schema.safeParse(paso2Valido).success).toBe(true);
  });

  it("permite dirección aproximada ausente", () => {
    const sinDireccion = {
      operacion: "venta",
      tipo: "apartamento",
      barrio: "Cedritos",
      area_m2: "78",
      habitaciones: "3",
      precio_esperado: "420.000.000",
    };
    expect(paso2Schema.safeParse(sinDireccion).success).toBe(true);
  });

  it("rechaza operación o tipo fuera del enum", () => {
    expect(
      paso2Schema.safeParse({ ...paso2Valido, operacion: "permuta" }).success,
    ).toBe(false);
    expect(
      paso2Schema.safeParse({ ...paso2Valido, tipo: "bodega" }).success,
    ).toBe(false);
  });

  it("rechaza área fuera de rango y no numérica", () => {
    expect(
      paso2Schema.safeParse({ ...paso2Valido, area_m2: "5" }).success,
    ).toBe(false);
    expect(
      paso2Schema.safeParse({ ...paso2Valido, area_m2: "abc" }).success,
    ).toBe(false);
  });

  it("rechaza precio por debajo del mínimo", () => {
    expect(
      paso2Schema.safeParse({ ...paso2Valido, precio_esperado: "500000" })
        .success,
    ).toBe(false);
  });

  it("rechaza demasiadas habitaciones", () => {
    expect(
      paso2Schema.safeParse({ ...paso2Valido, habitaciones: "99" }).success,
    ).toBe(false);
  });
});

describe("paso3Schema (consentimiento)", () => {
  it("exige consentimiento true explícito", () => {
    expect(paso3Schema.safeParse({ consentimiento: true }).success).toBe(true);
    expect(paso3Schema.safeParse({ consentimiento: false }).success).toBe(
      false,
    );
    expect(paso3Schema.safeParse({}).success).toBe(false);
  });
});

describe("registroSchema (completo) + construirPayload", () => {
  const completo = { ...paso1Valido, ...paso2Valido, consentimiento: true };

  it("valida el registro completo", () => {
    expect(registroSchema.safeParse(completo).success).toBe(true);
  });

  it("construye el payload de la RPC con tipos normalizados", () => {
    const datos = registroSchema.parse(completo);
    const payload = construirPayload(datos);
    expect(payload).toMatchObject({
      nombre: "Ana Gómez",
      whatsapp: "+573001234567",
      email: null,
      ciudad: "Bogotá",
      zona: null,
      operacion: "venta",
      tipo: "apartamento",
      barrio: "Cedritos",
      direccion: "Calle 140 aprox.",
      area: 78,
      habitaciones: 3,
      precio: 420000000,
      consentimiento: true,
    });
  });

  it("mete null en dirección cuando viene vacía", () => {
    const datos = registroSchema.parse({
      ...completo,
      direccion_aproximada: "",
    });
    expect(construirPayload(datos).direccion).toBeNull();
  });

  it("lanza si recibe datos inválidos (salvaguarda)", () => {
    const invalido = {
      ...completo,
      whatsapp: "roto",
      precio_esperado: "0",
    } as unknown as DatosRegistro;
    expect(() => construirPayload(invalido)).toThrow();
  });
});
