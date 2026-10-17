// Revisa que un árbol de textos tenga paridad real entre idiomas (regla de producto 10). El tipo
// `Arbol` ya obliga a que cada hoja tenga `es` y `en` en compilación; esto cubre lo que el tipo no
// ve: hojas vacías, un «inglés» que es copia del español, marcadores `{n}` que no coinciden y claves
// sueltas. Lo aplica `tests/unit/textos-paridad.test.ts` a todo `src/textos`.

export type ProblemaParidad = { ruta: string; problema: string };

function marcadores(texto: string): string[] {
  return [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

export function revisarParidad(
  arbol: unknown,
  // Rutas (p. ej. «contacto.whatsapp») cuyo texto es idéntico en los dos idiomas A PROPÓSITO.
  iguales: ReadonlySet<string> = new Set(),
  ruta = "",
): ProblemaParidad[] {
  const problemas: ProblemaParidad[] = [];
  const aqui = ruta || "(raíz)";

  if (Array.isArray(arbol)) {
    arbol.forEach((v, i) =>
      problemas.push(...revisarParidad(v, iguales, `${ruta}[${i}]`)),
    );
    return problemas;
  }
  if (typeof arbol !== "object" || arbol === null) {
    return [{ ruta: aqui, problema: "valor sin idioma (debe ser { es, en })" }];
  }

  const claves = Object.keys(arbol);
  if (claves.includes("es") || claves.includes("en")) {
    const hoja = arbol as Record<string, unknown>;
    if (
      claves.length !== 2 ||
      typeof hoja.es !== "string" ||
      typeof hoja.en !== "string"
    ) {
      return [
        {
          ruta: aqui,
          problema: "hoja mal formada: debe tener solo es y en (cadenas)",
        },
      ];
    }
    const es = hoja.es.trim();
    const en = hoja.en.trim();
    if (!es) problemas.push({ ruta: aqui, problema: "es vacío" });
    if (!en) problemas.push({ ruta: aqui, problema: "en vacío" });
    if (es && en && es === en && !iguales.has(ruta)) {
      problemas.push({
        ruta: aqui,
        problema:
          "en es idéntico a es (¿sin redactar?). Si es un nombre propio, decláralo en IGUALES",
      });
    }
    if (marcadores(hoja.es).join() !== marcadores(hoja.en).join()) {
      problemas.push({
        ruta: aqui,
        problema: `marcadores distintos: es{${marcadores(hoja.es)}} en{${marcadores(hoja.en)}}`,
      });
    }
    return problemas;
  }

  for (const [clave, valor] of Object.entries(arbol)) {
    problemas.push(
      ...revisarParidad(valor, iguales, ruta ? `${ruta}.${clave}` : clave),
    );
  }
  return problemas;
}
