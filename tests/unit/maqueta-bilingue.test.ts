// Paridad de idiomas de las maquetas (regla 20): la del comprador (S6) y la de vivienda nueva (S11). Cada maqueta escribe cada texto en
// pareja: `<t-es>…</t-es><t-en>…</t-en>`, y lo que no admite marcado en pares de atributos
// (`data-es`/`data-en`, `data-aria-es`/`data-aria-en`, `<title>` + `data-titulo-en`). Este gate exige:
//   · (Prettier escribe `<t-es\n>`: los patrones toleran espacio antes del `>`.)
//   · cada <t-es> va seguido de su <t-en>, los dos con texto y distintos (redactado, no copiado);
//   · todo par de atributos está completo, con texto y distinto;
//   · ningún texto visible queda FUERA de una pareja, salvo nombres propios, cifras y unidades
//     (barrios reales del catálogo, personas de ejemplo, la marca): es el barrido de literales de la
//     app, aplicado a la maqueta.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

// Las carpetas de maqueta con páginas en pares ES/EN. La de vivienda nueva reusa el estilo y el script de la del comprador.
const CARPETAS = ["comprador", "vivienda-nueva"];
const BASE = resolve(process.cwd(), "docs/diseno");

// Nombres de barrio del mapa (datos reales de Catastro): no se traducen.
const mapa = { MAPA: { sectores: [] as { n: string }[] } };
runInNewContext(
  readFileSync(join(BASE, "comprador/assets/mapa-datos.js"), "utf8"),
  { window: mapa },
);
const BARRIOS = mapa.MAPA.sectores.map((s) => s.n);

// Lo que se escribe igual en los dos idiomas.
const PROPIOS = [
  "Innmobiliaria",
  "Chapinero",
  "Bogotá",
  "Usaquén",
  "Andrés R.",
  "Laura Martínez",
  "Laura",
  "Camilo P.",
  "Camilo",
  "LM",
  "CP",
  "ES",
  "EN",
  "INN-4821",
  "m²",
];

function texto(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sinScripts(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/g, "")
    .replace(/<style\b[\s\S]*?<\/style>/g, "");
}

for (const carpeta of CARPETAS) {
  const DIR = join(BASE, carpeta);
  const paginas = existsSync(DIR)
    ? readdirSync(DIR).filter((f) => f.endsWith(".html"))
    : [];

  describe(`maqueta ${carpeta}: paridad ES/EN`, () => {
    it("hay páginas que verificar", () => {
      expect(paginas.length).toBeGreaterThan(0);
    });

    for (const pagina of paginas) {
      const html = sinScripts(readFileSync(join(DIR, pagina), "utf8"));

      it(`${pagina}: cada <t-es> tiene su <t-en>, con texto y redactado`, () => {
        const es = (html.match(/<t-es\s*>/g) ?? []).length;
        const en = (html.match(/<t-en\s*>/g) ?? []).length;
        const pares = [
          ...html.matchAll(
            /<t-es\s*>([\s\S]*?)<\/t-es\s*>\s*<t-en\s*>([\s\S]*?)<\/t-en\s*>/g,
          ),
        ];
        expect({ es, en }, `${pagina}: conteo`).toEqual({
          es: pares.length,
          en: pares.length,
        });
        for (const [, a, b] of pares) {
          expect(texto(a).length, `${pagina}: <t-es> vacío`).toBeGreaterThan(0);
          expect(
            texto(b).length,
            `${pagina}: <t-en> vacío junto a «${texto(a)}»`,
          ).toBeGreaterThan(0);
          expect(texto(b), `${pagina}: inglés copiado del español`).not.toBe(
            texto(a),
          );
        }
      });

      it(`${pagina}: los pares de atributos están completos y redactados`, () => {
        for (const [es, en] of [
          ["data-es", "data-en"],
          ["data-aria-es", "data-aria-en"],
        ]) {
          const etiquetas =
            html.match(new RegExp(`<[^>]*\\s${es}="[^"]*"[^>]*>`, "g")) ?? [];
          const sueltas =
            html.match(new RegExp(`<[^>]*\\s${en}="[^"]*"[^>]*>`, "g")) ?? [];
          expect(sueltas.length, `${pagina}: ${en} sin ${es}`).toBe(
            etiquetas.length,
          );
          for (const e of etiquetas) {
            const a = e.match(new RegExp(`\\s${es}="([^"]*)"`))?.[1] ?? "";
            const b = e.match(new RegExp(`\\s${en}="([^"]*)"`))?.[1];
            expect(b, `${pagina}: ${e} sin ${en}`).toBeDefined();
            // Un ejemplo de formato (p. ej. el texto de un CTL) puede ser idéntico: es dato, no interfaz.
            if (!/^ANOTACIÓN/.test(a))
              expect(b, `${pagina}: ${es} copiado`).not.toBe(a);
          }
        }
        const titulo = html.match(
          /<title data-titulo-en="([^"]+)">([^<]+)<\/title>/,
        );
        expect(titulo, `${pagina}: <title> sin data-titulo-en`).not.toBeNull();
        expect(titulo?.[1]).not.toBe(titulo?.[2]);
      });

      it(`${pagina}: ningún texto visible queda fuera de una pareja`, () => {
        const cuerpo = html
          .replace(/<head>[\s\S]*?<\/head>/, "")
          .replace(/<t-es\s*>[\s\S]*?<\/t-es\s*>/g, " ")
          .replace(/<t-en\s*>[\s\S]*?<\/t-en\s*>/g, " ")
          .replace(/<option\b[^>]*>[\s\S]*?<\/option>/g, (o) =>
            /data-es=/.test(o) ? " " : o,
          )
          .replace(/<svg\b[\s\S]*?<\/svg>/g, " ");
        let resto = texto(cuerpo);
        for (const p of [...PROPIOS, ...BARRIOS].sort(
          (a, b) => b.length - a.length,
        )) {
          resto = resto.split(p).join(" ");
        }
        // Quedan solo cifras, signos y símbolos (⭐, →, ·, ✓…): ninguna palabra.
        const palabras = resto.match(/\p{L}{2,}/gu) ?? [];
        expect(palabras, `${pagina}: texto suelto`).toEqual([]);
      });
    }
  });
}
