import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated directories:
    "coverage/**",
    ".open-next/**",
    ".wrangler/**",
    // Worker de MapLibre copiado de node_modules por `pnpm build:maplibre` (minificado, no es nuestro).
    "public/maplibre/**",
    // design-sync: scripts staged del skill + build del bundle + caché (máquina, no repo)
    ".ds-sync/**",
    "ds-bundle/**",
    ".design-sync/.cache/**",
  ]),
]);

export default eslintConfig;
