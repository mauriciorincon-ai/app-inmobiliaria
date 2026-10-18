// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// La llave del servidor se salta la RLS (ADR 015): solo una lista CERRADA de módulos puede importar el
// módulo que la usa. Este test recorre `src/` y falla si aparece cualquier otro importador. El S8 (ADR 016)
// la amplió a propósito: el adaptador de identidad, los avisos por correo de la visita y el trabajo diario; el
// S9 (ADR 017), con las alertas por correo.

const RAIZ = path.resolve(__dirname, "../../src");
const PERMITIDOS = [
  "app/api/cron/diario/route.ts",
  "app/api/whatsapp/webhook/route.ts",
  // S9 (ADR 017): crear la alerta (devuelve el token de confirmar) y los resúmenes del cron.
  "lib/alertas-correo.ts",
  "lib/identidad.ts",
  "lib/visitas-correo.ts",
];
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
  it("solo la importan el webhook, la identidad, los avisos de la visita, las alertas y el cron", () => {
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
