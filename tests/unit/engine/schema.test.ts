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
  localidad: "Chapinero",
  barrio: "Los Rosales",
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
  it("rechaza decimales en área, habitaciones y precio: «85.5» no puede leerse como 855", () => {
    for (const [campo, valor] of [
      ["area_m2", "85.5"],
      ["area_m2", "85,5"],
      ["habitaciones", "2.5"],
      ["precio_esperado", "420,000,000.00"],
      ["precio_esperado", "420.000.000,50"],
    ] as const) {
      const r = paso2Schema.safeParse({ ...paso2Valido, [campo]: valor });
      expect(r.success, `${campo}=${valor}`).toBe(false);
    }
  });

  it("acepta el entero escrito a la inglesa o a la colombiana, y construirPayload lo lee igual", () => {
    for (const precio of ["420,000,000", "420.000.000", "420000000"]) {
      const r = paso2Schema.safeParse({
        ...paso2Valido,
        area_m2: "1,200",
        precio_esperado: precio,
      });
      expect(r.success, precio).toBe(true);
    }
    const completo = {
      ...paso1Valido,
      ...paso2Valido,
      area_m2: "1,200",
      precio_esperado: "420,000,000",
      consentimiento: true as const,
    };
    const p = construirPayload(completo as DatosRegistro);
    expect(p.area).toBe(1200);
    expect(p.precio).toBe(420000000);
  });

  it("acepta un inmueble válido", () => {
    expect(paso2Schema.safeParse(paso2Valido).success).toBe(true);
  });

  it("permite dirección aproximada ausente", () => {
    const sinDireccion = {
      operacion: "venta",
      tipo: "apartamento",
      localidad: "Chapinero",
      barrio: "Los Rosales",
      area_m2: "78",
      habitaciones: "3",
      precio_esperado: "420.000.000",
    };
    expect(paso2Schema.safeParse(sinDireccion).success).toBe(true);
  });

  it("rechaza sin localidad o con localidad fuera de la lista", () => {
    const { localidad: _l, ...sinLoc } = paso2Valido;
    void _l;
    expect(paso2Schema.safeParse(sinLoc).success).toBe(false);
    expect(
      paso2Schema.safeParse({ ...paso2Valido, localidad: "Medellín" }).success,
    ).toBe(false);
  });

  it("el barrio es del catálogo catastral de esa localidad (ADR 014)", () => {
    const err = (barrio: string, localidad = "Chapinero") => {
      const r = paso2Schema.safeParse({ ...paso2Valido, barrio, localidad });
      return r.success
        ? null
        : r.error.issues.map((i) => `${String(i.path[0])}:${i.message}`);
    };
    expect(err("Los Rosales")).toBeNull();
    // sin tildes ni mayúsculas también vale: así lo ve el trigger de la BD
    expect(err("LOS ROSALES")).toBeNull();
    expect(err("Usaquen", "Usaquén")).toBeNull();
    // texto libre, o un barrio de OTRA localidad, no
    expect(err("Cedritos Libre")).toEqual(["barrio:barrioNoCatalogo"]);
    expect(err("Los Rosales", "Suba")).toEqual(["barrio:barrioNoCatalogo"]);
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

describe("paso3Schema (consentimiento + email opcional)", () => {
  it("exige consentimiento true explícito", () => {
    expect(paso3Schema.safeParse({ consentimiento: true }).success).toBe(true);
    expect(paso3Schema.safeParse({ consentimiento: false }).success).toBe(
      false,
    );
    expect(paso3Schema.safeParse({}).success).toBe(false);
  });

  it("email opcional: vacío/ausente OK, válido OK, mal formado rechazado", () => {
    expect(paso3Schema.safeParse({ consentimiento: true }).success).toBe(true);
    expect(
      paso3Schema.safeParse({ consentimiento: true, email: "" }).success,
    ).toBe(true);
    expect(
      paso3Schema.safeParse({ consentimiento: true, email: "a@b.co" }).success,
    ).toBe(true);
    expect(
      paso3Schema.safeParse({ consentimiento: true, email: "no-es-correo" })
        .success,
    ).toBe(false);
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
      zona: "Chapinero", // S3 — la localidad va como zona
      operacion: "venta",
      tipo: "apartamento",
      barrio: "Los Rosales",
      direccion: "Calle 140 aprox.",
      area: 78,
      habitaciones: 3,
      precio: 420000000,
      consentimiento: true,
      ref: null,
    });
  });

  it("el payload lleva el nombre del catálogo, no lo escrito (la BD y el slug usan el mismo)", () => {
    const datos = registroSchema.parse({ ...completo, barrio: "los rosales" });
    expect(construirPayload(datos).barrio).toBe("Los Rosales");
  });

  it("recoge email del paso 3 y normaliza el ref (inválido ⇒ null)", () => {
    const datos = registroSchema.parse({
      ...completo,
      email: "ANA@Example.CO ",
    });
    expect(construirPayload(datos, "aB3_xY-9").ref).toBe("aB3_xY-9");
    expect(construirPayload(datos, "no-valido").ref).toBeNull();
    expect(construirPayload(datos).ref).toBeNull();
    // el email se recorta pero conserva mayúsculas (Postgres lo guarda tal cual, sin lower forzado)
    expect(construirPayload(datos).email).toBe("ANA@Example.CO");
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
