import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

// La sonda de las migraciones contra la NUBE (S16). No corre en la CI ni con `pnpm test`: la corre quien aplica una migración,
// después de `supabase db push` (`pnpm sonda:nube`). Lee la URL del pooler que deja el CLI y, de `.env.local`, SOLO las variables
// `SUPABASE_DB_*` (Vitest no carga `.env.local` por su cuenta, salvo las `VITE_*`): la contraseña de la base y, si la hay, la CA.
// Una variable ya exportada en el entorno gana a la del archivo. Jamás se imprime ninguna.
function variablesDeLaBase(): Record<string, string> {
  let texto = "";
  try {
    texto = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  } catch {
    return {};
  }
  const salida: Record<string, string> = {};
  for (const linea of texto.split("\n")) {
    const m = /^\s*(SUPABASE_DB_[A-Z_]+)\s*=\s*(.*?)\s*$/.exec(linea);
    if (!m || process.env[m[1]]) continue;
    salida[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return salida;
}

export default defineConfig({
  test: {
    include: ["tests/nube/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    env: variablesDeLaBase(),
  },
});
