import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Las cifras de evidencia débil que `design-system.md` («Cifras en UI/copy — regla dura») prohíbe jamás llegan a lo que lee un
// dueño o un comprador: los textos de la app, las guías del paquete fundador, el brochure, su export y el manual. El S16 encontró
// la misma cifra de Redfin («32 % más rápido») escrita de otras dos formas («un tercio más rápido», «89 días frente a 123») en la
// portada, en un correo y en una guía: por eso el patrón busca la cifra en sus variantes, no una frase. (`public/conoce.html` es
// una copia del brochure que hace el build y no se versiona.)
const PROHIBIDAS: Array<[string, RegExp]> = [
  ["Redfin: 32 % más rápido", /32\s?% (más|faster)|tercio más rápido|third faster|\b89 (d[ií]as|days)\b/i],
  ["vistas +118 %", /\+?118\s?%/],
  ["3× contactos", /3\s?×\s?(m[aá]s )?contact/i],
  ["tours 3D 31 % / 9 %", /31\s?% (más|faster)|9\s?% (más precio|mayor)/i],
  ["staging 98,5–99 %", /98[,.]5/],
  ["Habi 20–25 % bajo mercado", /20\s?[–-]\s?25\s?% (bajo|below)/i],
  ["suplantada 300 veces", /300 veces|300 times/i],
  ["+35 % denuncias (Camacol)", /camacol|35\s?% (más )?(de )?denuncias/i],
];

const raiz = process.cwd();
const deCarpeta = (dir: string, ext: string) =>
  readdirSync(join(raiz, dir))
    .filter((f) => f.endsWith(ext))
    .map((f) => join(dir, f));
const ARCHIVOS = [
  ...deCarpeta("src/textos", ".ts"),
  ...deCarpeta("public/paquete-fundador", ".html"),
  "docs/BROCHURE.html",
  "docs/brochure-export.json",
  "docs/MANUAL-DE-USO.md",
  "README.md",
];

describe("cifras prohibidas (design-system.md, regla dura)", () => {
  for (const archivo of ARCHIVOS) {
    it(`${archivo} no trae ninguna`, () => {
      // Un comentario de HTML no lo lee nadie (el brochure nombra las prohibidas en el suyo, para quien lo edite).
      const texto = readFileSync(join(raiz, archivo), "utf8").replace(/<!--[\s\S]*?-->/g, "");
      for (const [nombre, patron] of PROHIBIDAS) {
        const m = patron.exec(texto);
        expect(m, `${archivo}: «${m?.[0]}» (${nombre})`).toBeNull();
      }
    });
  }
});
