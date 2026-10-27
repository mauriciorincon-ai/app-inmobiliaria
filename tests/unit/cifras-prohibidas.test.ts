import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Las cifras de evidencia débil que `design-system.md` («Cifras en UI/copy — regla dura») prohíbe jamás llegan a lo que lee un
// dueño o un comprador: los textos de la app, las guías del paquete fundador, el brochure, su export y el manual. El S16 encontró
// la misma cifra de Redfin («32 % más rápido») escrita de otras dos formas («un tercio más rápido», «89 días frente a 123») en la
// portada, en un correo y en una guía: por eso el patrón busca la cifra en sus variantes, no una frase. (`public/conoce.html` es
// una copia del brochure que hace el build y no se versiona.)
const PROHIBIDAS: Array<[string, RegExp]> = [
  ["Redfin: 32 % más rápido", /32\s?% (más|faster)|tercio más rápido|third faster|\b(89|123) (d[ií]as|days)\b|\b89 (vs|v\.|frente a|versus|against) 123\b/i],
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
// Los motores arman correos y plantillas con texto: también ahí (S16: dos comentarios de `src/` seguían listando la de Redfin).
const deArbol = (dir: string): string[] =>
  readdirSync(join(raiz, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? deArbol(join(dir, e.name))
      : /\.(ts|tsx)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
const ARCHIVOS = [
  ...deCarpeta("src/textos", ".ts"),
  ...deArbol("src/engine"),
  ...deCarpeta("public/paquete-fundador", ".html"),
  "docs/BROCHURE.html",
  "docs/brochure-export.json",
  "docs/MANUAL-DE-USO.md",
  "README.md",
];

// El gate se demuestra fallando (regla 15): una muestra por patrón, escrita como la escribiría alguien, que DEBE coincidir. Si un
// patrón se afloja y deja de verla, este bloque se pone en rojo antes de que el gate deje pasar la cifra.
const MUESTRAS: Record<string, string[]> = {
  "Redfin: 32 % más rápido": [
    "se vende un 32 % más rápido",
    "32% faster",
    "un tercio más rápido",
    "a third faster",
    "vendidos en 89 días",
    "sold in 89 days",
    "89 vs 123 días",
    "123 days on the market",
  ],
  "vistas +118 %": ["+118 % de vistas", "118% more views"],
  "3× contactos": ["3× más contactos", "3 × contactos"],
  "tours 3D 31 % / 9 %": ["31 % más", "9 % más precio", "9% mayor"],
  "staging 98,5–99 %": ["98,5 % de los casos", "98.5% of cases"],
  "Habi 20–25 % bajo mercado": ["20–25 % bajo el mercado", "20-25% below market"],
  "suplantada 300 veces": ["suplantada 300 veces", "impersonated 300 times"],
  "+35 % denuncias (Camacol)": ["según Camacol", "35 % más de denuncias"],
};

describe("el gate de cifras prohibidas detecta cada variante (demo en rojo)", () => {
  it("hay muestras para todos los patrones", () => {
    expect(Object.keys(MUESTRAS).sort()).toEqual(PROHIBIDAS.map(([n]) => n).sort());
  });
  for (const [nombre, patron] of PROHIBIDAS) {
    it(`«${nombre}» ve todas sus muestras`, () => {
      for (const muestra of MUESTRAS[nombre] ?? []) {
        expect(patron.test(muestra), `«${muestra}» debería coincidir`).toBe(true);
      }
    });
  }
  it("y una cifra permitida no dispara nada", () => {
    for (const [, patron] of PROHIBIDAS) {
      expect(patron.test("comisión del 3 % · 7–7,5 meses de venta · CTL $23.000")).toBe(false);
    }
  });
});

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
