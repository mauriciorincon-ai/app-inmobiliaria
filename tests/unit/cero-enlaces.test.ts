// @vitest-environment node
// kit v2.0.0 — regla 17. Demo en rojo del gate de cero enlaces: debe detectar la fuga de la homepage de nutri-kids
// (2026-08: el campo homepage del repo apuntaba al subdominio de Vercel de producción) y una URL en un archivo versionado.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buscarEnArbol, evaluarHomepage, leerConfig, patronDesde } from "../../scripts/cero-enlaces.mjs";

const config = leerConfig(fileURLToPath(new URL("../../cero-enlaces.json", import.meta.url))); // raíz del kit, sin depender del cwd
// Los dominios se arman por partes: este archivo está versionado y el gate (git grep) no debe detectarse a sí mismo.
const d = (a: string, b: string) => `${a}.${b}`;
const VERCEL = d("vercel", "app"), WORKERS = d("workers", "dev");
const DEFECTO = [VERCEL, WORKERS, d("pages", "dev"), d("netlify", "app"), d("github", "io"), d("onrender", "com"), d("fly", "dev"), d("herokuapp", "com")];

describe("cero-enlaces (regla 17)", () => {
  it("los patrones del stack detectan el identificador concreto de producción y no los marcadores genéricos", () => {
    // Se arman por partes: este archivo está versionado y el gate no debe detectarse a sí mismo.
    const ref = "abcdefghij" + "klmnopqrst"; // 20 letras, como el ref de un proyecto Supabase
    const hex = "0123456789" + "abcdef0123" + "456789abcdef01"; // 32 hex, como el bucket público de R2
    const supabase = `https://${ref}.${d("supabase", "co")}`;
    const r2 = `https://pub-${hex}.${d("r2", "dev")}`;
    expect(evaluarHomepage(supabase, config)).toBe(supabase);
    expect(evaluarHomepage(r2, config)).toBe(r2);
    // Los marcadores y dummies legítimos (docs, CI, comentarios) NO deben disparar el gate.
    expect(evaluarHomepage(`https://<ref>.${d("supabase", "co")}`, config)).toBeNull();
    expect(evaluarHomepage(`https://pub-e2e-dummy.${d("r2", "dev")}`, config)).toBeNull();
    expect(evaluarHomepage(`https://pub-tuhash.${d("r2", "dev")}`, config)).toBeNull();
  });

  it("la configuración trae los 8 dominios por defecto (y los hosts reales del stack que esta app suma) y es ampliable", () => {
    // Adaptación local (S4): el kit fijaba EXACTAMENTE 8; la regla 17 manda ampliar con el host real del stack.
    expect(config.dominios).toEqual(expect.arrayContaining(DEFECTO));
    const ampliada = { ...config, dominios: [...config.dominios, "mi-dominio.co"] };
    expect(evaluarHomepage("https://app.mi-dominio.co", ampliada)).toBe("https://app.mi-dominio.co");
  });

  it("habría detectado la fuga de la homepage de nutri-kids (subdominio de Vercel en el campo homepage del repo)", () => {
    const fugaReal = `https://app-nutri-kids.${VERCEL}`; // valor leído del repo con gh repo view el 2026-10-06
    expect(evaluarHomepage(fugaReal, config)).toBe(fugaReal);
    expect(evaluarHomepage(`https://app-ejemplo-git-main-usuario.${VERCEL}/`, config)).not.toBeNull();
  });

  it("homepage vacía o apuntando al propio repo es limpia", () => {
    expect(evaluarHomepage("", config)).toBeNull();
    expect(evaluarHomepage(undefined, config)).toBeNull();
    expect(evaluarHomepage("https://github.com/usuario-ejemplo/app-ejemplo", config)).toBeNull();
  });

  it("detecta una URL de producción en un archivo versionado y no se delata con la forma escapada", () => {
    const dir = mkdtempSync(join(tmpdir(), "cero-enlaces-"));
    execFileSync("git", ["init", "-q"], { cwd: dir });
    writeFileSync(join(dir, "README.md"), `Demo: https://mi-app.${WORKERS}/ (fuga a propósito)\n`);
    writeFileSync(join(dir, "ci.yml"), "patrón citado como vercel[.]app — no es una URL\n");
    writeFileSync(join(dir, "pnpm-lock.yaml"), `resolved: https://registry.${VERCEL}/x\n`);
    execFileSync("git", ["add", "-A"], { cwd: dir });
    const hallazgos = buscarEnArbol(config, dir);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatch(/^README\.md:1:/);
  });

  it("el patrón escapa los puntos para que cero-enlaces.json y los workflows no se detecten a sí mismos", () => {
    // Adaptación local (S4): los 8 del kit van PRIMERO y escapados; la app suma después los patrones de su stack.
    const patron = patronDesde(config);
    expect(patron.startsWith("vercel[.]app|workers[.]dev|pages[.]dev|netlify[.]app|github[.]io|onrender[.]com|fly[.]dev|herokuapp[.]com")).toBe(true);
    // Ningún punto sin escapar: el archivo que cita el patrón no se delata a sí mismo.
    expect(patron.replace(/\[\.\]/g, "")).not.toContain(".");
  });
});
