// Gate de CONTROLADORES (kit v1.32.0, regla 22): todo control dibujado en una maqueta tiene su script
// cargado. Plantilla del kit endurecida para Innmobiliaria (S6):
//   · recorre docs/diseno/ entero (las maquetas viven en subcarpetas, p. ej. comprador/);
//   · todo `src` de script existe y es local (la maqueta se abre con doble clic, sin red);
//   · una página con controles carga al menos un script;
//   · cada atributo `data-*` que una página usa lo lee alguno de los scripts que carga: un gancho
//     sin lector es un control dibujado que no hace nada (el origen de la regla en Big-D).
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const RAIZ = resolve(process.cwd(), "docs/diseno");

function paginas(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const ruta = join(dir, f);
    if (statSync(ruta).isDirectory()) return paginas(ruta);
    return f.endsWith(".html") ? [ruta] : [];
  });
}

const CONTROL =
  /<(button|select|input|textarea|details)\b[^>]*>|\brole="(button|switch|tab|slider)"|\bdata-(accion|controlador|paso|lang-set|ir-estado|alternar|abre)=/g;
const SCRIPT =
  /<script\b[^>]*\bsrc="([^"]+)"[^>]*>|<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
const ETIQUETA = /<[a-z][^>]*>/gi;
const DATA = /\s(data-[a-z][a-z0-9-]*)(?==|\s|>|\/)/g;

const lista = paginas(RAIZ);

describe("maqueta: controladores con script cargado", () => {
  it("hay maquetas que verificar", () => {
    expect(lista.length).toBeGreaterThan(0);
  });

  for (const pagina of lista) {
    const nombre = relative(RAIZ, pagina);
    const html = readFileSync(pagina, "utf8");
    const scripts = [...html.matchAll(SCRIPT)];
    const srcs = scripts.map((m) => m[1]).filter(Boolean);

    it(`${nombre}: todo script es local y existe; si dibuja controles, carga alguno`, () => {
      for (const src of srcs) {
        expect(
          /^https?:|^\/\//.test(src),
          `${nombre}: script externo (${src})`,
        ).toBe(false);
        expect(
          existsSync(join(dirname(pagina), src)),
          `${nombre}: falta ${src}`,
        ).toBe(true);
      }
      const controles = (html.match(CONTROL) ?? []).filter(
        (c) => !c.startsWith("<details"),
      );
      if (controles.length > 0) {
        const inline = scripts.some((m) => (m[2] ?? "").trim().length > 0);
        expect(
          srcs.length > 0 || inline,
          `${nombre}: ${controles.length} control(es) y ningún script`,
        ).toBe(true);
      }
    });

    it(`${nombre}: cada atributo data-* tiene quien lo lea`, () => {
      const fuente =
        srcs
          .map((s) => readFileSync(join(dirname(pagina), s), "utf8"))
          .join("\n") + scripts.map((m) => m[2] ?? "").join("\n");
      const etiquetas = (html.match(ETIQUETA) ?? []).join(" ");
      const usados = new Set([...etiquetas.matchAll(DATA)].map((m) => m[1]));
      const huerfanos = [...usados].filter(
        (a) => !new RegExp(`${a}(?![a-z0-9-])`).test(fuente),
      );
      expect(huerfanos, `${nombre}: atributos sin lector`).toEqual([]);
    });
  }
});
