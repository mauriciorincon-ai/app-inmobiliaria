// El barrido de absolutos del texto legal (S14): una frase como «siempre» o «nunca» afirma más de lo que una norma suele decir, y
// se busca por la promesa, no por la palabra de la feature (lección del S13). Recorre un árbol de diccionario `{es, en}` y devuelve
// dónde hay una. Lo que una norma dice con esas palabras va entre comillas o se parafrasea sin ellas.
const ABSOLUTOS_ES: readonly RegExp[] = [
  /\bsiempre\b/i,
  /\bnunca\b/i,
  /\bjam[aá]s\b/i,
  /\bobligatori[oa]s?\b/i,
  /\bsin excepci[oó]n\b/i,
  /\ben todo caso\b/i,
  /\btodos los casos\b/i,
  /\bgarantiz/i,
];
const ABSOLUTOS_EN: readonly RegExp[] = [
  /\balways\b/i,
  /\bnever\b/i,
  /\bmandatory\b/i,
  /\bwithout exception\b/i,
  /\bin every case\b/i,
  /\bguarantee/i,
];

export type Absoluto = { ruta: string; idioma: "es" | "en"; palabra: string };

export function absolutosEn(arbol: unknown, ruta = ""): Absoluto[] {
  if (Array.isArray(arbol)) {
    return arbol.flatMap((x, i) => absolutosEn(x, `${ruta}[${i}]`));
  }
  if (arbol && typeof arbol === "object") {
    const o = arbol as Record<string, unknown>;
    if (typeof o.es === "string" && typeof o.en === "string") {
      const hallados: Absoluto[] = [];
      for (const re of ABSOLUTOS_ES) {
        const m = re.exec(o.es);
        if (m) hallados.push({ ruta, idioma: "es", palabra: m[0] });
      }
      for (const re of ABSOLUTOS_EN) {
        const m = re.exec(o.en);
        if (m) hallados.push({ ruta, idioma: "en", palabra: m[0] });
      }
      return hallados;
    }
    return Object.entries(o).flatMap(([k, v]) =>
      absolutosEn(v, ruta ? `${ruta}.${k}` : k),
    );
  }
  return [];
}
