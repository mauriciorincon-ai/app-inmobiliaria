#!/usr/bin/env node
// Valida el lector de CTL (S15) contra certificados REALES que viven SOLO en `privado/ctl/` (ignorada por git). Imprime solo
// CONTEOS: ni un nombre, ni una matrícula, ni el nombre de un archivo, ni una línea del certificado.
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/ctl-validar.mjs [AAAA-MM-DD]
//
// Por cada `privado/ctl/<x>.txt` puede haber un `privado/ctl/<x>.esperado.json` con la lectura hecha a mano:
//   { "marcas": [{ "tipo": "hipoteca", "anotacion": 2, "vigente": false }], "noReconocidas": [3] }
// Un desacuerdo es una marca (tipo, anotación, vigencia) o una «no reconocida» que el lector y la lectura a mano no comparten.
// Sale con 1 si `privado/ctl` no está ignorada, si hay desacuerdos o si hay menos de 2 certificados con su lectura a mano (S16,
// pregunta 1a del usuario: antes 3): el lector se enciende (`LECTOR_CTL_ACTIVO=1`) solo con una salida 0, y la guarda de
// despliegue corre este script antes de dejarlo pasar. También cuenta los textos que el lector ve incompletos.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerCtl } from "../src/engine/ctl/lector.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(RAIZ, "privado", "ctl");
const MINIMO = 2;

// 1. La carpeta tiene que estar ignorada ANTES de leer nada (regla 17-bis: el arnés declara su árbol y aborta si no es privado).
try {
  execFileSync("git", ["check-ignore", "-q", "privado/ctl/x.txt"], { cwd: RAIZ });
} catch {
  console.error("ABORTO: privado/ctl no está ignorada por git. No se lee ningún certificado.");
  process.exit(1);
}
console.log("Árbol: privado/ctl (ignorada por git). Solo se imprimen conteos.");

const hoy = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const archivos = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".txt")) : [];

const cuenta = {
  certificados: archivos.length,
  conLecturaAMano: 0,
  sinAnotaciones: 0,
  anotaciones: 0,
  noReconocidas: 0,
  cancelacionesSinNumero: 0,
  referenciasRotas: 0,
  incompletos: 0,
  desacuerdos: 0,
};
const porTipo = {};

const clave = (m) => `${m.tipo}|${m.anotacion}|${m.vigente}`;
for (const f of archivos) {
  const l = leerCtl(readFileSync(join(DIR, f), "utf8"), hoy);
  if (l.estado !== "leido") {
    cuenta.sinAnotaciones++;
    continue;
  }
  cuenta.anotaciones += l.anotaciones;
  cuenta.noReconocidas += l.noReconocidas.length;
  cuenta.cancelacionesSinNumero += l.cancelacionesSinNumero.length;
  cuenta.referenciasRotas += l.referenciasRotas.length;
  if (l.completitud.estado === "no") cuenta.incompletos++;
  for (const m of l.marcas) {
    const t = (porTipo[m.tipo] ??= { vigentes: 0, canceladas: 0 });
    if (m.vigente) t.vigentes++;
    else t.canceladas++;
  }
  const esperado = join(DIR, f.replace(/\.txt$/, ".esperado.json"));
  if (!existsSync(esperado)) continue;
  cuenta.conLecturaAMano++;
  const e = JSON.parse(readFileSync(esperado, "utf8"));
  const lector = new Set(l.marcas.map(clave));
  const aMano = new Set((e.marcas ?? []).map(clave));
  for (const k of lector) if (!aMano.has(k)) cuenta.desacuerdos++;
  for (const k of aMano) if (!lector.has(k)) cuenta.desacuerdos++;
  const nrL = new Set(l.noReconocidas.map((n) => n.anotacion));
  const nrM = new Set(e.noReconocidas ?? []);
  for (const n of nrL) if (!nrM.has(n)) cuenta.desacuerdos++;
  for (const n of nrM) if (!nrL.has(n)) cuenta.desacuerdos++;
}

console.log(JSON.stringify({ ...cuenta, marcas: porTipo }, null, 2));
const listo = cuenta.conLecturaAMano >= MINIMO && cuenta.desacuerdos === 0;
console.log(
  listo
    ? "VALIDADO: el lector puede encenderse (LECTOR_CTL_ACTIVO=1)."
    : `SIN VALIDAR: hacen falta ${MINIMO} certificados con su lectura a mano y cero desacuerdos. El lector queda apagado.`,
);
process.exit(listo ? 0 : 1);
