import path from "node:path";
import { defineConfig } from "vitest/config";

// Config que el ci.yml del kit ya asume (job quality: "pnpm test").
// Patrón validado en app-nutri-kids S1 y app-ds S1. Cada app ajusta `coverage.include` a sus
// motores puros y puede subir los umbrales.
// ⚠ K7 (ds S1): los umbrales SOLO se aplican si el script `test` pasa `--coverage`. El estampado
// lo omite a propósito (CI verde día 0 sin tests); al escribir los PRIMEROS tests del S1, añade
// `--coverage` al script `test` de package.json — es parte del setup del sprint, no una sorpresa.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // unit = motor puro (con umbral de cobertura); component = Testing Library sobre la lógica de
    // UI nueva del S2 (score en vivo, gate de fotos, editor, opt-in, magic link). El umbral 80×4
    // aplica solo al motor (coverage.include); los tests de componente son regresión, no cobertura.
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/component/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      // Solo el MOTOR puro entra a cobertura. Los adaptadores IO de `src/lib/` (cliente Supabase,
      // logger, wrapper de Sentry) son integración y se cubren por e2e, no por unit tests — la
      // propia plantilla del kit invita a ajustar este glob al layout de motores de la app (S1).
      // Solo *.ts: un include de directorio hace que v8 intente parsear .gitkeep y truene con
      // PARSE_ERROR (K8, ds S1).
      include: ["src/engine/**/*.ts"],
      thresholds: {
        // Motor puro (regla 2 del CLAUDE.md): >80%.
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
