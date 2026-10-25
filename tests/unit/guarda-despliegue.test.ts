// @vitest-environment node
// Guarda de despliegue (S13). Un gate propio nuevo se demuestra fallando (regla 15): con cada perilla de prueba
// encendida —en el entorno, en un `.env*` o en las `vars` de wrangler— la guarda se niega y dice dónde, sin imprimir
// valores; con todo limpio pasa. El último caso corre el comando de verdad en un directorio temporal.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  esPerillaDePrueba,
  leerArchivos,
  leerEnv,
  revisar,
  varsDeWrangler,
} from "../../scripts/guarda-despliegue.mjs";

const SCRIPT = fileURLToPath(
  new URL("../../scripts/guarda-despliegue.mjs", import.meta.url),
);
const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

describe("guarda de despliegue", () => {
  it("reconoce las perillas por su nombre: *_SIMULACRO, *_MOCK y los dos frenos de la CI", () => {
    for (const n of [
      "NUEVOS_SIMULACRO",
      "TASA_SIMULACRO",
      "BREVO_MOCK",
      "IDENTIDAD_MOCK",
      "DISABLE_RATE_LIMIT",
      "REGISTRO_MIN_MS",
      // S15: el lector de CTL nace apagado y espera su validación con certificados reales.
      "LECTOR_CTL_ACTIVO",
      // Una perilla futura que siga la convención queda cubierta sin tocar la lista.
      "SALAS_SIMULACRO",
      "OTRO_MOCK",
    ]) {
      expect(esPerillaDePrueba(n), n).toBe(true);
    }
    for (const n of [
      "NEXT_PUBLIC_APP_URL",
      "BREVO_API_KEY",
      "OPERADOR_EMAIL",
      "MOCKINGBIRD",
      "SIMULACRO_NOTA",
    ]) {
      expect(esPerillaDePrueba(n), n).toBe(false);
    }
  });

  it("DEMO EN ROJO: el lector de CTL encendido en el entorno, en un .env o en wrangler detiene el despliegue; apagado, no", () => {
    expect(revisar({ entorno: { LECTOR_CTL_ACTIVO: "1" } })).toEqual([
      { nombre: "LECTOR_CTL_ACTIVO", donde: "entorno" },
    ]);
    expect(
      revisar({
        archivos: {
          ".env.production.local": "LECTOR_CTL_ACTIVO=1",
          "wrangler.jsonc": '{ "vars": { "LECTOR_CTL_ACTIVO": "1" } }',
        },
      }),
    ).toEqual([
      { nombre: "LECTOR_CTL_ACTIVO", donde: ".env.production.local" },
      { nombre: "LECTOR_CTL_ACTIVO", donde: "wrangler.jsonc" },
    ]);
    expect(revisar({ entorno: { LECTOR_CTL_ACTIVO: "0" } })).toEqual([]);
    expect(
      revisar({ archivos: { ".env.local": "LECTOR_CTL_ACTIVO=" } }),
    ).toEqual([]);
  });

  it("DEMO EN ROJO: cada perilla encendida en el entorno, en un .env o en wrangler detiene el despliegue", () => {
    const e = revisar({ entorno: { NUEVOS_SIMULACRO: "1", PATH: "/usr/bin" } });
    expect(e).toEqual([{ nombre: "NUEVOS_SIMULACRO", donde: "entorno" }]);

    const f = revisar({
      archivos: {
        ".env.local":
          "BREVO_MOCK=1\nREGISTRO_MIN_MS=0\nDISABLE_RATE_LIMIT=true",
        ".env.production": "export TASA_SIMULACRO='1'",
        "wrangler.jsonc": `{ // comentario
          "vars": { "IDENTIDAD_MOCK": "1", "R2_BUCKET": "x" }
        }`,
      },
    });
    expect(f.map((h) => `${h.nombre}@${h.donde}`).sort()).toEqual([
      "BREVO_MOCK@.env.local",
      "DISABLE_RATE_LIMIT@.env.local",
      "IDENTIDAD_MOCK@wrangler.jsonc",
      "REGISTRO_MIN_MS@.env.local",
      "TASA_SIMULACRO@.env.production",
    ]);
  });

  it("REGISTRO_MIN_MS es la espera mínima del registro: con 0 (el valor de la CI) o con cualquier otro valor se niega", () => {
    for (const v of ["0", "3000"]) {
      expect(
        revisar({ archivos: { ".env.local": `REGISTRO_MIN_MS=${v}` } }),
      ).toEqual([{ nombre: "REGISTRO_MIN_MS", donde: ".env.local" }]);
    }
    expect(revisar({ archivos: { ".env.local": "REGISTRO_MIN_MS=" } })).toEqual(
      [],
    );
  });

  it("vacías, comentadas, con 0 o false: no se enciende nada", () => {
    expect(
      revisar({
        entorno: {
          BREVO_MOCK: "",
          TASA_SIMULACRO: "0",
          NUEVOS_SIMULACRO: "false",
        },
        archivos: {
          ".env.local": "# BREVO_MOCK=1\nIDENTIDAD_MOCK=\nNUEVOS_SIMULACRO=0",
          "wrangler.jsonc":
            '{ "vars": { "R2_BUCKET": "innmobiliaria-fotos" } }',
        },
      }),
    ).toEqual([]);
  });

  it("lee el .env sin interpretarlo y las vars de wrangler aunque lleven comentarios y URL", () => {
    expect(leerEnv("A=1\n# B=2\n  export C = tres \n\nD=")).toEqual([
      ["A", "1"],
      ["C", "tres"],
      ["D", ""],
    ]);
    expect(
      varsDeWrangler(`{
        /* bloque */
        "$schema": "https://example.invalid/schema.json", // línea
        "vars": { "R2_BUCKET": "x" }
      }`),
    ).toEqual([["R2_BUCKET", "x"]]);
    expect(varsDeWrangler('{ "name": "sin-vars" }')).toEqual([]);
  });

  it("el repo, tal como está, pasa", () => {
    expect(
      revisar({ entorno: {}, archivos: leerArchivos(RAIZ) }),
      "los .env* del repo y wrangler.jsonc no llevan ninguna perilla de prueba",
    ).toEqual([]);
  });

  it("el comando sale con 1, nombra lo encontrado y no imprime ningún valor", () => {
    const dir = mkdtempSync(join(tmpdir(), "guarda-"));
    writeFileSync(join(dir, ".env.local"), "BREVO_MOCK=valor-secreto-123\n");
    let salida = "";
    let codigo = 0;
    try {
      execFileSync(process.execPath, [SCRIPT], {
        cwd: dir,
        env: { PATH: process.env.PATH ?? "", NODE_ENV: "production" },
        stdio: "pipe",
      });
    } catch (e) {
      const err = e as { status: number; stderr: Buffer };
      codigo = err.status;
      salida = err.stderr.toString();
    }
    expect(codigo).toBe(1);
    expect(salida).toContain("BREVO_MOCK (.env.local)");
    expect(salida).not.toContain("valor-secreto-123");

    // Sin la perilla, el mismo comando sale con 0.
    writeFileSync(join(dir, ".env.local"), "NEXT_PUBLIC_APP_URL=x\n");
    const ok = execFileSync(process.execPath, [SCRIPT], {
      cwd: dir,
      env: { PATH: process.env.PATH ?? "", NODE_ENV: "production" },
      encoding: "utf8",
    });
    expect(ok).toContain("guarda de despliegue");
  });
});
