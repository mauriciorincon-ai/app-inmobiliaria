// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// La llave del servidor se salta la RLS (ADR 015): SOLO el webhook de WhatsApp puede importar el módulo
// que la usa. Este test recorre `src/` y falla si aparece cualquier otro importador.

const RAIZ = path.resolve(__dirname, "../../src");
const PERMITIDOS = ["app/api/whatsapp/webhook/route.ts"];
const IMPORTA =
  /from\s+["'](?:@\/lib\/supabase\/servicio|[./]+(?:lib\/)?supabase\/servicio|\.\/servicio)["']/;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx)$/.test(nombre) ? [ruta] : [];
  });
}

function importadores(raiz: string): string[] {
  return archivos(raiz)
    .filter((ruta) => IMPORTA.test(readFileSync(ruta, "utf8")))
    .map((ruta) => path.relative(raiz, ruta).split(path.sep).join("/"))
    .sort();
}

describe("la llave del servidor (servicio.ts)", () => {
  it("solo la importa el webhook de WhatsApp", () => {
    expect(importadores(RAIZ)).toEqual(PERMITIDOS);
  });

  it("la expresión detecta los tres estilos de import (la guarda falla cuando debe)", () => {
    for (const linea of [
      'import { crearClienteServicio } from "@/lib/supabase/servicio";',
      "import { crearClienteServicio } from '../../lib/supabase/servicio';",
      'import { crearClienteServicio } from "./servicio";',
    ]) {
      expect(IMPORTA.test(linea), linea).toBe(true);
    }
    expect(IMPORTA.test('import { x } from "@/lib/supabase/server";')).toBe(
      false,
    );
  });
});
