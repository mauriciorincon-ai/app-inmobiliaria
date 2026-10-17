// Diccionario bilingüe (regla de producto 10). Cada texto es una HOJA `{ es, en }` y los textos de una
// pantalla forman un árbol de hojas en `src/textos/<área>.ts`. El tipo obliga a que existan las dos
// lenguas en compilación; `tests/unit/textos-paridad.test.ts` exige además que no estén vacías ni
// sean la misma cadena. Sin librería: el idioma llega por la ruta interna `/[lang]` (ADR 013) y las
// páginas siguen siendo estáticas.
import type { Idioma } from "./idiomas";

export type Hoja = { readonly es: string; readonly en: string };
export type Arbol =
  Hoja | { readonly [clave: string]: Arbol } | readonly Arbol[];

// Lo que queda al proyectar un árbol a UN idioma: cada hoja pasa a ser una cadena.
export type Proyectado<T> = T extends Hoja
  ? string
  : T extends readonly (infer U)[]
    ? Proyectado<U>[]
    : T extends object
      ? { [K in keyof T]: Proyectado<T[K]> }
      : T;

export function esHoja(valor: unknown): valor is Hoja {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return false;
  }
  const claves = Object.keys(valor);
  return (
    claves.length === 2 &&
    typeof (valor as Hoja).es === "string" &&
    typeof (valor as Hoja).en === "string"
  );
}

// Proyecta un árbol a un idioma. Los componentes cliente reciben SOLO el árbol proyectado por props,
// así el bundle del navegador no lleva el otro idioma.
export function enIdioma<T extends Arbol>(
  arbol: T,
  idioma: Idioma,
): Proyectado<T> {
  if (esHoja(arbol)) return arbol[idioma] as Proyectado<T>;
  if (Array.isArray(arbol)) {
    return arbol.map((a) => enIdioma(a as Arbol, idioma)) as Proyectado<T>;
  }
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(arbol as Record<string, Arbol>)) {
    salida[k] = enIdioma(v, idioma);
  }
  return salida as Proyectado<T>;
}

// Rellena marcadores `{nombre}` de un texto ya proyectado: «{n} fotos» → «3 fotos».
export function rellenar(
  texto: string,
  valores: Record<string, string | number>,
): string {
  return texto.replace(/\{(\w+)\}/g, (marca, clave: string) =>
    clave in valores ? String(valores[clave]) : marca,
  );
}
