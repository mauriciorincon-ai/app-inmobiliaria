import { describe, expect, it } from "vitest";
import {
  ERR,
  LIMITES,
  paso1Schema,
  paso2Schema,
  paso3Schema,
  registroSchema,
  esCodigoError,
} from "@/engine/registro/schema";
import { textoDeError } from "@/engine/registro/errores";
import { enIdioma } from "@/i18n/textos";
import { PUBLICAR } from "@/textos/publicar";

// El esquema de registro da CÓDIGOS; el diccionario los vuelve frases. Este test cierra el puente:
// no puede haber un código sin frase, una frase sin código, ni un mensaje del esquema que no sea código.

describe("códigos de validación ↔ diccionario", () => {
  it("cada código de ERR tiene su frase y cada frase tiene su código", () => {
    expect(Object.keys(PUBLICAR.errores).sort()).toEqual(
      Object.keys(ERR).sort(),
    );
  });

  it("todo mensaje que produce el esquema es un código conocido", () => {
    const malos = [
      [paso1Schema, { nombre: "", whatsapp: "", ciudad: "" }],
      [
        paso1Schema,
        { nombre: "x".repeat(81), whatsapp: "123", ciudad: "x".repeat(61) },
      ],
      [paso2Schema, {}],
      [
        paso2Schema,
        {
          operacion: "venta",
          tipo: "casa",
          localidad: "Suba",
          barrio: "x".repeat(81),
          direccion_aproximada: "x".repeat(121),
          area_m2: "5",
          habitaciones: "99",
          precio_esperado: "1",
        },
      ],
      [
        paso2Schema,
        { area_m2: "abc", habitaciones: "x", precio_esperado: "abc" },
      ],
      [paso3Schema, { consentimiento: false, email: "a".repeat(121) }],
      [paso3Schema, { consentimiento: true, email: "no-es-correo" }],
      [registroSchema, {}],
    ] as const;
    const mensajes = malos.flatMap(([schema, valores]) => {
      const r = schema.safeParse(valores);
      return r.success ? [] : r.error.issues.map((i) => i.message);
    });
    expect(mensajes.length).toBeGreaterThan(15);
    const desconocidos = mensajes.filter((m) => !esCodigoError(m));
    // Un campo ausente (`{}`) cae en el mensaje por defecto de Zod; la UI lo cambia por la frase
    // genérica (`textoDeError`), así que nunca llega en otro idioma. Los demás deben ser códigos.
    expect(
      desconocidos.every((m) => /expected|invalid|required/i.test(m)),
      desconocidos.join(" | "),
    ).toBe(true);
  });
});

describe("textoDeError", () => {
  const es = enIdioma(PUBLICAR, "es");
  const en = enIdioma(PUBLICAR, "en");

  it("rellena los límites en cada idioma", () => {
    expect(textoDeError(ERR.areaRango, es.errores, es.envio.generico)).toBe(
      `El área debe estar entre ${LIMITES.areaMin} y ${LIMITES.areaMax} m²`,
    );
    expect(textoDeError(ERR.areaRango, en.errores, en.envio.generico)).toBe(
      `The area must be between ${LIMITES.areaMin} and ${LIMITES.areaMax} m²`,
    );
    expect(
      textoDeError(ERR.habitacionesMax, en.errores, en.envio.generico),
    ).toBe(`${LIMITES.habMax} bedrooms maximum`);
  });

  it("un mensaje que no es código cae en la frase genérica del idioma, nunca en inglés de Zod", () => {
    expect(
      textoDeError(
        "Invalid input: expected string",
        en.errores,
        en.envio.generico,
      ),
    ).toBe(en.envio.generico);
  });
});
