# Notas de design-sync — app-inmobiliaria

Primera sincronización: 2026-07-17, proyecto "Innmobiliaria — Design System"
(`06511338-a500-4747-9051-cbb8093db58c`). 5 componentes, 15 celdas, todas `good`.

## Particularidades de este repo (app Next.js, no librería)

- **No hay dist**: el build usa `--entry ./dist/index.js` (inexistente a propósito — el walk-up
  encuentra el package.json raíz y el modo soft activa la síntesis desde `srcDir`).
- **`srcDir` = `.design-sync/entries/`** (stubs de re-export): el entry sintetizado SOLO camina
  `srcDir`, y `export * from` NO re-exporta defaults. Por eso: (a) los 5 componentes tienen
  **export nombrado además del default** en su fuente (no quitarlos), y (b) cada componente
  nuevo necesita su stub en `entries/` + línea en `entries/index.ts` + pin en
  `componentSrcMap` (el pin apunta al src real: alimenta .d.ts y previews).
- **`extraEntries` en orden**: `preview-shims.ts` PRIMERO (define `globalThis.process` — el
  código cliente de next/* lo consulta y sin él el IIFE muere al cargar), luego
  `preview-provider.tsx` (`DSProvider` monta el AppRouterContext que `next/link` necesita).
- **Tailwind v4 CSS-first**: `buildCmd` compila `.design-sync/tw-input.css` (importa
  `globals.css` + safelist `@source inline()` = vocabulario del agente de diseño). **Re-correr
  `buildCmd` tras autorar/editar previews** (sus clases de glue deben entrar al CSS compilado).
  El `printf` final añade `--font-poppins` a `:root` (en la app la define next/font).
- **Poppins**: woff2 subset latin committeados en `.design-sync/fonts/` (Google Fonts, OFL).
- **tsconfig `paths`**: `"app-inmobiliaria"` → `entries/index.ts` para que `pnpm typecheck`
  valide las previews contra la API real en CI.
- **Playwright del render check**: `npm i playwright@<pin del repo>` dentro de `.ds-sync/` con
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (el chromium cacheado en `~/Library/Caches/ms-playwright`
  es build 1228 = pin de playwright-core 1.61.1; verificar coincidencia si el repo actualiza).
- **`guidelinesGlob` fijado a `design-system.md`**: el glob por defecto arrastraba
  `docs/APROVISIONAMIENTO.md` y `docs/MANUAL-DE-USO.md` (no son guías de diseño).
- **Ojo con el cwd del shell**: dos veces se colaron archivos en `.ds-sync/` por un `cd`
  persistente; correr todo desde la raíz del repo.

## Known render warns

(ninguno)

## Re-sync risks

- `entries/index.ts` y los stubs deben seguir el alta de componentes — si se olvida, el nuevo
  componente compila pero no llega al bundle (síntoma: `[BUNDLE_EXPORT]`).
- La **safelist** de `tw-input.css` ES el vocabulario utilitario del agente: al crecer el
  design system (S2: fotos, score), extenderla y re-validar los nombres enumerados en
  `conventions.md` contra el CSS fresco.
- `conventions.md` enumera clases y componentes por nombre — tras cambios de tokens o API,
  correr la pasada de validación (grep contra `ds-bundle/`) antes de subir.
- Los woff2 son una foto de Google Fonts v24 — funcionales para siempre; si la marca cambia de
  fuente, reemplazar `fonts/` + `extraFonts` + `--font-poppins`.
- `.ds-sync/` es regenerable: `cp -r` de los scripts del skill + `npm i esbuild ts-morph
@types/react` + playwright (arriba).
