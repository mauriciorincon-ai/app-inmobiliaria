#!/usr/bin/env node
// Guarda de despliegue (S13): ninguna perilla de prueba entra al Worker. `opennextjs-cloudflare build` hornea los
// archivos `.env*` de producción en el paquete y el Worker lee además las `vars` de `wrangler.jsonc`: un `*_SIMULACRO`,
// un `*_MOCK` o un freno apagado dejado ahí llegaría a producción sin que nadie lo vea (el S12 lo dejó como deuda).
// Por nombre, no por lista: una perilla nueva que siga la convención (`*_SIMULACRO`, `*_MOCK`) queda cubierta sola.
// S15: también veta los interruptores de producto sin validar (`SIN_VALIDAR`), que solo se apagan por una decisión del usuario.
// Imprime SOLO el nombre y el sitio de lo que encuentra, jamás un valor.
// Uso: `node scripts/guarda-despliegue.mjs` (lo corre `pnpm deploy:cf` antes de construir).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Los archivos que Next carga en un build de producción, en orden de precedencia (no `.env.development*`).
export const ARCHIVOS_ENV = [
  ".env.production.local",
  ".env.local",
  ".env.production",
  ".env",
];

const POR_NOMBRE = /(_SIMULACRO|_MOCK)$/;
// Frenos y esperas que solo se apagan en la CI.
const FRENOS = new Set(["DISABLE_RATE_LIMIT", "REGISTRO_MIN_MS"]);
// Interruptores de producto que nacen APAGADOS y solo se encienden con una decisión del usuario (S15): el lector de CTL espera su
// validación con certificados reales. Encenderlo en producción es quitarlo de esta lista a propósito, no un descuido en un `.env`.
const SIN_VALIDAR = new Set(["LECTOR_CTL_ACTIVO"]);

export const esPerillaDePrueba = (nombre) =>
  POR_NOMBRE.test(nombre) || FRENOS.has(nombre) || SIN_VALIDAR.has(nombre);

/** `CLAVE=valor` por línea; ignora comentarios y vacías. Devuelve [clave, valor] sin interpretar el valor. */
export function leerEnv(texto) {
  const filas = [];
  for (const linea of texto.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(linea);
    if (m) filas.push([m[1], m[2].trim()]);
  }
  return filas;
}

// Un valor vacío, «0» o «false» no enciende una perilla; cualquier otra cosa sí. La excepción es REGISTRO_MIN_MS: es la
// espera mínima del registro y la CI la fija en 0 para saltarla, así que en producción NO debe estar definida (con 0 menos).
const encendida = (nombre, valor) => {
  const v = valor
    .replace(/^["']|["']$/g, "")
    .trim()
    .toLowerCase();
  if (nombre === "REGISTRO_MIN_MS") return v !== "";
  return v !== "" && v !== "0" && v !== "false";
};

/** Claves de `vars` de wrangler.jsonc (JSONC: quita comentarios de línea y de bloque antes de leer). */
export function varsDeWrangler(texto) {
  const limpio = texto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
  const json = JSON.parse(limpio);
  return Object.entries(json.vars ?? {}).map(([k, v]) => [k, String(v)]);
}

/**
 * Lo que impediría desplegar: `[{ nombre, donde }]`. `entorno` es el de este proceso; `archivos` es `{ ruta: texto }`
 * (los `.env*` y, con la clave `wrangler.jsonc`, su texto).
 */
export function revisar({ entorno = {}, archivos = {} }) {
  const hallazgos = [];
  const ver = (pares, donde) => {
    for (const [nombre, valor] of pares) {
      if (esPerillaDePrueba(nombre) && encendida(nombre, valor)) {
        hallazgos.push({ nombre, donde });
      }
    }
  };
  ver(
    Object.entries(entorno).map(([k, v]) => [k, String(v ?? "")]),
    "entorno",
  );
  for (const [ruta, texto] of Object.entries(archivos)) {
    ver(
      ruta === "wrangler.jsonc" ? varsDeWrangler(texto) : leerEnv(texto),
      ruta,
    );
  }
  return hallazgos;
}

export function leerArchivos(raiz) {
  const archivos = {};
  for (const ruta of [...ARCHIVOS_ENV, "wrangler.jsonc"]) {
    const completa = join(raiz, ruta);
    if (existsSync(completa)) archivos[ruta] = readFileSync(completa, "utf8");
  }
  return archivos;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const hallazgos = revisar({
    entorno: process.env,
    archivos: leerArchivos(process.cwd()),
  });
  if (hallazgos.length > 0) {
    console.error(
      "✗ no se despliega: hay perillas de prueba encendidas que llegarían a producción:",
    );
    for (const h of hallazgos) console.error(`  · ${h.nombre} (${h.donde})`);
    console.error(
      "Quítalas del archivo o del entorno y vuelve a correr `pnpm deploy:cf`.",
    );
    process.exit(1);
  }
  console.log(
    "✓ guarda de despliegue: ninguna perilla de prueba (*_SIMULACRO, *_MOCK, frenos) en el entorno, los .env* ni las vars de wrangler",
  );
}
