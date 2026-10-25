// @vitest-environment node
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// S14 — el asistente del papeleo corre en el teléfono y lo que se escribe NO sale de él. Este gate lo prueba en el código: recorre todo
// lo que carga la isla del cliente (los `import`, incluido el diferido) y falla si trae zod, la base, la analítica o un almacén, o si
// algún archivo hace una petición, guarda algo o dibuja un <form>. El e2e lo comprueba además en vivo (ninguna petición lleva el precio).
const RAIZ = join(__dirname, "..", "..");
const ENTRADA = "src/components/papeleo/PapeleoCarga.tsx";

function resolverImport(desde: string, destino: string): string | null {
  const base = destino.startsWith("@/")
    ? join(RAIZ, "src", destino.slice(2))
    : destino.startsWith(".")
      ? resolve(dirname(desde), destino)
      : null;
  if (!base) return null;
  for (const ext of ["", ".ts", ".tsx", ".json", "/index.ts", "/index.tsx"]) {
    const f = base + ext;
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

type Cierre = { archivos: Set<string>; externos: Set<string> };

/** Los archivos y paquetes que quedan en el bundle desde `entrada` (los `import type` se borran al compilar). */
function cierre(
  entrada: string,
  c: Cierre = { archivos: new Set(), externos: new Set() },
): Cierre {
  const archivo = join(RAIZ, entrada);
  if (c.archivos.has(archivo)) return c;
  c.archivos.add(archivo);
  if (archivo.endsWith(".json")) return c;
  const texto = readFileSync(archivo, "utf8");
  const destinos = [
    ...texto.matchAll(/^import\s+(?!type\b)[^;]*?from\s+"([^"]+)";/gm),
    ...texto.matchAll(/^import\s+"([^"]+)";/gm),
    ...texto.matchAll(/\bimport\(\s*"([^"]+)"\s*\)/g),
  ].map((m) => m[1]);
  for (const d of destinos) {
    const f = resolverImport(archivo, d);
    if (f) cierre(f.replace(RAIZ + "/", ""), c);
    else c.externos.add(d);
  }
  return c;
}

// Lo que una pantalla que no manda nada afuera no puede traer.
const PROHIBIDOS_IMPORT = [
  /^zod(\/|$)/,
  /^@supabase\//,
  /^posthog/,
  /^@sentry\//,
  /\/lib\/(supabase|api-cliente|posthog|observability|capacidad-cliente|almacen-local|favoritos-cliente|precio-cliente)/,
];
const PROHIBIDOS_CODIGO: readonly [string, RegExp][] = [
  ["fetch", /\bfetch\s*\(/],
  ["XMLHttpRequest", /\bXMLHttpRequest\b/],
  ["sendBeacon", /\bsendBeacon\b/],
  ["localStorage", /\blocalStorage\b/],
  ["sessionStorage", /\bsessionStorage\b/],
  ["indexedDB", /\bindexedDB\b/],
  ["cookie", /\bdocument\.cookie\b/],
  ["form", /<form\b/],
];

function problemasDe(c: Cierre): string[] {
  const p: string[] = [];
  const todos = [
    ...c.externos,
    ...[...c.archivos].map((a) => "@" + a.replace(RAIZ, "")),
  ];
  for (const imp of todos)
    for (const re of PROHIBIDOS_IMPORT) if (re.test(imp)) p.push(`trae ${imp}`);
  for (const a of c.archivos) {
    if (!/\.tsx?$/.test(a)) continue;
    const codigo = readFileSync(a, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const [nombre, re] of PROHIBIDOS_CODIGO) {
      // La única cookie que toca la isla es la del idioma (`src/i18n/idiomas.ts`, que la isla importa solo para dar formato a las cifras).
      if (nombre === "cookie" && a === join(RAIZ, "src/i18n/idiomas.ts"))
        continue;
      if (re.test(codigo)) p.push(`${a.replace(RAIZ + "/", "")}: ${nombre}`);
    }
  }
  return p;
}

describe("la isla del papeleo no manda nada afuera", () => {
  const real = cierre(ENTRADA);
  const rel = [...real.archivos].map((a) => a.replace(RAIZ + "/", ""));

  it("el recorrido llega a la isla, al motor y a los datos (no se quedó en el cargador)", () => {
    for (const esperado of [
      "src/components/papeleo/Papeleo.tsx",
      "src/components/papeleo/PapeleoGastos.tsx",
      "src/components/papeleo/PapeleoGuia.tsx",
      "src/components/papeleo/PapeleoClausulas.tsx",
      // S15 — el lector de CTL entra a la isla por el import diferido y se revisa igual que el resto.
      "src/components/papeleo/PapeleoCtl.tsx",
      "src/engine/ctl/lector.ts",
      "src/data/normas-ctl.json",
      "src/engine/papeleo/gastos.ts",
      "src/engine/papeleo/guia.ts",
      "src/data/tarifas-papeleo.json",
      "src/data/tarifas-escrituracion.json",
    ])
      expect(rel, esperado).toContain(esperado);
  });

  it("sin zod, sin base, sin analítica, sin almacén y sin una sola petición", () => {
    expect(problemasDe(real)).toEqual([]);
  });

  it("DEMO EN ROJO: el mismo recorrido sí encuentra zod en el lector de vivienda nueva y el almacén local en el simulador", () => {
    expect(
      problemasDe(cierre("src/engine/vivienda-nueva/lectura.ts")).join(" | "),
    ).toContain("trae zod");
    expect(
      problemasDe(cierre("src/components/herramientas/Simulador.tsx")).join(
        " | ",
      ),
    ).toMatch(/capacidad-cliente|localStorage/);
  });

  it("DEMO EN ROJO: el detector de código ve cada petición y cada almacén aunque estén escritos de otro modo", () => {
    for (const [nombre, re] of PROHIBIDOS_CODIGO) {
      const muestra: Record<string, string> = {
        fetch: 'await fetch("/api/x")',
        XMLHttpRequest: "new XMLHttpRequest()",
        sendBeacon: "navigator.sendBeacon(u, d)",
        localStorage: "window.localStorage.setItem(a, b)",
        sessionStorage: "sessionStorage.getItem(a)",
        indexedDB: "indexedDB.open(a)",
        cookie: "document.cookie = a",
        form: "<form onSubmit={f}>",
      };
      expect(re.test(muestra[nombre]), nombre).toBe(true);
    }
  });
});
