// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FRANJAS_VISITA } from "@/engine/visita/franjas";
import { CORREOS_VISITA } from "@/textos/correos-visita";
import { OPERADOR } from "@/textos/operador";
import { VIVIENDA_NUEVA } from "@/textos/vivienda-nueva";

// S13 — las franjas de la visita a una sala viven en tres sitios (la base, la ruta/el formulario y los textos). Esta prueba los
// ata: si alguien suma una franja en uno y se olvida de otro, falla aquí y no en producción.

const migracion = readFileSync(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "supabase",
    "migrations",
    "20261027000001_salas_y_muestra.sql",
  ),
  "utf8",
);

describe("franjas de la visita a una sala", () => {
  it("son las mismas que el CHECK de la base y que valida la función pública", () => {
    const check = /franja in \(([^)]*)\)/.exec(migracion);
    expect(check).not.toBeNull();
    const enBase = [...(check as RegExpExecArray)[1].matchAll(/'([a-z_]+)'/g)]
      .map((m) => m[1])
      .sort();
    expect(enBase).toEqual([...FRANJAS_VISITA].sort());
    // La función pública usa la misma lista para rechazar una franja inválida.
    const funcion = /p_franja not in \(([^)]*)\)/.exec(migracion);
    expect(funcion).not.toBeNull();
    const enFuncion = [
      ...(funcion as RegExpExecArray)[1].matchAll(/'([a-z_]+)'/g),
    ]
      .map((m) => m[1])
      .sort();
    expect(enFuncion).toEqual([...FRANJAS_VISITA].sort());
  });

  it("cada franja tiene su texto en el formulario, en los correos y en el panel del operador, en los dos idiomas", () => {
    for (const f of FRANJAS_VISITA) {
      for (const hoja of [
        (VIVIENDA_NUEVA.visita.pedir.franjas as Record<string, object>)[f],
        (CORREOS_VISITA.franja as Record<string, object>)[f],
        (OPERADOR.salas.franja as Record<string, object>)[f],
      ]) {
        expect(hoja, f).toBeDefined();
        expect(Object.keys(hoja).sort()).toEqual(["en", "es"]);
      }
    }
  });
});
