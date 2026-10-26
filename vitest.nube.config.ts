import { defineConfig } from "vitest/config";

// La sonda de las migraciones contra la NUBE (S16). No corre en la CI ni con `pnpm test`: la corre quien aplica una migración,
// después de `supabase db push` (`pnpm sonda:nube`). Lee la URL del pooler que deja el CLI y la contraseña de `.env.local`.
export default defineConfig({
  test: {
    include: ["tests/nube/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
  },
});
