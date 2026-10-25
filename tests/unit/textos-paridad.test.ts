// @vitest-environment node
import { describe, expect, it } from "vitest";
import { revisarParidad } from "@/i18n/paridad";
import { enIdioma, esHoja, rellenar } from "@/i18n/textos";

// Gate propio nuevo (regla 15): se demuestra fallando con fixtures malas y luego se aplica a todo el
// diccionario real de `src/textos`.

// Textos que son IGUALES en los dos idiomas a propósito (nombres propios, siglas). Cada uno con su
// ruta; una copia del español en otro lugar sigue fallando.
const IGUALES = new Set<string>([
  // Etiqueta de fila del resumen: «WhatsApp» es el nombre del servicio en cualquier idioma.
  "paso3.filas.whatsapp",
  // El nombre de la marca que coordina la visita a una sala de ventas (S13): es el mismo en los dos idiomas.
  "pagina.sala.equipo",
]);

describe("revisarParidad — lo que DEBE marcar", () => {
  it.each([
    ["falta en", { a: { es: "Hola" } }, "hoja mal formada"],
    ["falta es", { a: { en: "Hi" } }, "hoja mal formada"],
    [
      "clave extra",
      { a: { es: "Hola", en: "Hi", fr: "Salut" } },
      "hoja mal formada",
    ],
    ["es vacío", { a: { es: "  ", en: "Hi" } }, "es vacío"],
    ["en vacío", { a: { es: "Hola", en: "" } }, "en vacío"],
    [
      "inglés copiado del español",
      { a: { es: "Hola", en: "Hola" } },
      "idéntico",
    ],
    [
      "marcadores distintos",
      { a: { es: "{n} fotos", en: "photos" } },
      "marcadores",
    ],
    [
      "marcador con otro nombre",
      { a: { es: "{n} fotos", en: "{x} photos" } },
      "marcadores",
    ],
    ["texto suelto sin idioma", { a: "Hola" }, "sin idioma"],
    ["número suelto", { a: 3 }, "sin idioma"],
    ["error dentro de un arreglo", { a: [{ es: "x", en: "x" }] }, "idéntico"],
  ])("%s", (_nombre, arbol, esperado) => {
    const problemas = revisarParidad(arbol);
    expect(problemas.length).toBeGreaterThan(0);
    expect(problemas.map((p) => p.problema).join(" | ")).toContain(esperado);
  });

  it("indica la ruta exacta del problema", () => {
    const problemas = revisarParidad({
      landing: { hero: { es: "Hola", en: "Hola" } },
    });
    expect(problemas[0].ruta).toBe("landing.hero");
  });
});

describe("revisarParidad — lo que NO debe marcar", () => {
  it.each([
    ["hoja redactada", { a: { es: "Hola", en: "Hi" } }],
    [
      "marcadores iguales",
      { a: { es: "{n} fotos de {total}", en: "{n} of {total} photos" } },
    ],
    [
      "arreglo de hojas",
      {
        a: [
          { es: "Uno", en: "One" },
          { es: "Dos", en: "Two" },
        ],
      },
    ],
    ["árbol anidado", { a: { b: { c: { es: "Sí", en: "Yes" } } } }],
  ])("%s", (_nombre, arbol) => {
    expect(revisarParidad(arbol)).toEqual([]);
  });

  it("acepta un texto idéntico solo si su ruta está declarada", () => {
    const arbol = { marca: { es: "Innmobiliaria", en: "Innmobiliaria" } };
    expect(revisarParidad(arbol)).not.toEqual([]);
    expect(revisarParidad(arbol, new Set(["marca"]))).toEqual([]);
  });
});

describe("diccionario real (src/textos/*)", () => {
  const modulos = import.meta.glob("../../src/textos/*.ts", {
    eager: true,
  }) as Record<string, Record<string, unknown>>;
  const archivos = Object.keys(modulos);

  it("hay diccionarios que revisar", () => {
    expect(archivos.length).toBeGreaterThanOrEqual(3);
  });

  it.each(
    archivos.map((a) => [a.split("/").pop() as string, modulos[a]] as const),
  )("%s: paridad es/en completa", (_archivo, exportaciones) => {
    const problemas = Object.entries(exportaciones).flatMap(([nombre, arbol]) =>
      revisarParidad(arbol, IGUALES).map(
        (p) => `${nombre}.${p.ruta}: ${p.problema}`,
      ),
    );
    expect(problemas, problemas.join("\n")).toEqual([]);
  });
});

describe("enIdioma y rellenar", () => {
  const arbol = {
    titulo: { es: "Hola", en: "Hi" },
    lista: [{ es: "Uno", en: "One" }],
    anidado: { saludo: { es: "Buenas", en: "Hello" } },
  } as const;

  it("proyecta cada hoja al idioma pedido", () => {
    expect(enIdioma(arbol, "es")).toEqual({
      titulo: "Hola",
      lista: ["Uno"],
      anidado: { saludo: "Buenas" },
    });
    expect(enIdioma(arbol, "en")).toEqual({
      titulo: "Hi",
      lista: ["One"],
      anidado: { saludo: "Hello" },
    });
  });

  it("la proyección no deja rastro del otro idioma", () => {
    expect(JSON.stringify(enIdioma(arbol, "en"))).not.toContain("Hola");
  });

  it("esHoja distingue una hoja de un nodo", () => {
    expect(esHoja({ es: "a", en: "b" })).toBe(true);
    expect(esHoja({ es: "a" })).toBe(false);
    expect(esHoja({ es: "a", en: "b", fr: "c" })).toBe(false);
    expect(esHoja([{ es: "a", en: "b" }])).toBe(false);
    expect(esHoja(null)).toBe(false);
  });

  it("rellena marcadores y deja intactos los desconocidos", () => {
    expect(rellenar("{n} fotos de {total}", { n: 3, total: 10 })).toBe(
      "3 fotos de 10",
    );
    expect(rellenar("hay {x}", {})).toBe("hay {x}");
  });
});
