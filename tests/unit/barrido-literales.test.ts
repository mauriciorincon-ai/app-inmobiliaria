// @vitest-environment node
import { describe, expect, it } from "vitest";
import { barrer } from "./utils/barrido-literales";

// El barrido es un gate propio nuevo (regla 15): se demuestra fallando. Cada caso malo es un
// literal de texto en JSX que debe vivir en el diccionario; cada caso bueno, algo que no es texto.
const jsx = (cuerpo: string) =>
  `export default function X() { return (${cuerpo}); }`;

describe("barrido de literales — lo que DEBE marcar", () => {
  it.each([
    ["texto entre etiquetas", jsx("<p>Hola mundo</p>"), "texto-jsx"],
    ["texto con acentos", jsx("<h1>Cómo funciona</h1>"), "texto-jsx"],
    ["cadena en una expresión", jsx('<p>{"Hola"}</p>'), "texto-jsx"],
    // S16 (deuda del S5): las ramas de un ternario o de un `&&` que se pintan como texto.
    ["rama de un ternario", jsx('<p>{abierto ? "Cerrar" : t.abrir}</p>'), "texto-jsx"],
    ["rama de un &&", jsx('<p>{vacio && "No hay nada"}</p>'), "texto-jsx"],
    ["plantilla con parte fija", jsx("<p>{`Foto ${1}`}</p>"), "texto-jsx"],
    ["aria-label literal", jsx('<button aria-label="Cerrar" />'), "atributo"],
    ["alt literal", jsx('<img alt="Fachada" src="/x.png" />'), "atributo"],
    [
      "placeholder entre llaves",
      jsx('<input placeholder={"Ej: Cedritos"} />'),
      "atributo",
    ],
    [
      "label literal en un componente",
      jsx('<Campo label="Tipo de inmueble" />'),
      "atributo",
    ],
    ["hint literal", jsx('<Campo hint="Tu localidad" />'), "atributo"],
    [
      "metadata exportada",
      'export const metadata = { title: "Hola" };',
      "metadata",
    ],
  ])("%s", (_nombre, fuente, tipo) => {
    const hallazgos = barrer("x.tsx", fuente);
    expect(hallazgos.length).toBeGreaterThan(0);
    expect(hallazgos[0].tipo).toBe(tipo);
  });
});

describe("barrido de literales — datos, Zod y motores", () => {
  it.each([
    [
      "copy en un arreglo de datos",
      "const D = [{ titulo: 'Más denuncias', fig: 'x1' }];",
      "dato-texto",
    ],
    [
      "pregunta y respuesta",
      "const F = [{ q: 'Cuándo abren', a: 'Pronto' }];",
      "dato-texto",
    ],
    [
      "mensaje de acción",
      "const r = { accion: 'Sube tu primera foto', puntos: 1 };",
      "dato-texto",
    ],
    [
      "mensaje de Zod con .min",
      "z.string().min(2, 'Escribe tu nombre');",
      "mensaje-zod",
    ],
    [
      "mensaje de Zod con .refine",
      "z.string().refine(f, 'Solo números enteros');",
      "mensaje-zod",
    ],
    ["error de z.enum", "z.enum(X, { error: 'Elige el tipo' });", "dato-texto"],
    [
      "frase suelta en un motor",
      "const M = 'No pudimos subir la foto. Revisa tu conexión.';",
      "frase",
    ],
    [
      "plantilla larga en un motor",
      "const m = `Estoy publicando mi inmueble ${x} sin comisión`;",
      "frase",
    ],
  ])("%s", (_nombre, fuente, tipo) => {
    const hallazgos = barrer("x.ts", fuente);
    expect(hallazgos.length).toBeGreaterThan(0);
    expect(hallazgos[0].tipo).toBe(tipo);
  });

  it.each([
    [
      "clave que no es de texto",
      "const x = { ciudad: 'Bogotá', id: 'a b c d' };",
    ],
    [
      "nombre propio de tres palabras",
      "const L = ['Rafael Uribe Uribe', 'Ciudad Bolívar Sur'];",
    ],
    [
      "lista de clases de Tailwind en una clave texto",
      "const e = { texto: 'text-sm font-semibold text-gray hover:underline' };",
    ],
    ["unión de literales", "type E = 'sin-fotos' | 'sin-sello';"],
    ["import", "import x from 'a b c d';"],
    ["directiva", "'use client';"],
    ["registro interno", "logger.info('registro creado con exito ahora');"],
    ["error interno", "throw new Error('falta la variable de entorno X');"],
    ["cabecera HTTP", "const h = { 'content-type': 'application/json' };"],
    ["validador sin mensaje", "z.string().min(2).max(80);"],
    ["código de error", "return { ok: false, motivo: 'formato' };"],
  ])("%s", (_nombre, fuente) => {
    expect(barrer("x.ts", fuente)).toEqual([]);
  });
});

describe("barrido de literales — lo que NO debe marcar", () => {
  it.each([
    ["texto del diccionario", jsx("<p>{t.titulo}</p>")],
    ["solo espacios y saltos", jsx("<p>{' '}</p>")],
    ["símbolos sin letras", jsx("<span>→ · —</span>")],
    ["números", jsx("<span>2026</span>")],
    ["la marca", jsx("<span>Innmobiliaria</span>")],
    ["WhatsApp", jsx("<span>WhatsApp</span>")],
    ["clases y enlaces", jsx('<a className="font-bold" href="/publicar" />')],
    ["atributo del diccionario", jsx("<img alt={t.alt} />")],
    ["aria-label del diccionario", jsx("<nav aria-label={t.principal} />")],
    [
      "generateMetadata",
      "export async function generateMetadata() { return { title: t.x }; }",
    ],
    ["un comentario", "// Hola mundo\nexport const x = 1;"],
  ])("%s", (_nombre, fuente) => {
    expect(barrer("x.tsx", fuente)).toEqual([]);
  });
});
