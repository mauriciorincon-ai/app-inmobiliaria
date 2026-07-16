# Bitácora de implementación — Sprint 001 «La puerta fundadora»

> App: Innmobiliaria · Rama: `sprint-001/puerta-fundadora` · Horizonte: H1 (privado) · IA: cero.
> Plan aprobado: ver el plan del sprint (casa planeadora `SPRINT_001.md` + orden). Este archivo
> es la fuente viva del avance; la planeadora lo lee, no le reporto a mano.

## Fases

- **Fase 0 — Setup** — ✅ completa
- Fase 1 — Motor/núcleo — pendiente
- Fase 2 — UI — pendiente
- Fase 3 — Integración + e2e — pendiente
- Fase 4 — Calidad y cierre — pendiente

---

## Fase 0 — Setup

### Verificación de supuestos del kit (2026-07-15)

| Supuesto del kit                               | Resultado                                                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `githooks/pre-commit` ejecutable               | ✅ EJECUTABLE (100755)                                                                                                                          |
| `git config core.hooksPath` ⇒ `githooks`       | ✅ `githooks`                                                                                                                                   |
| `gitleaks` instalado                           | ✅ v8.30.1                                                                                                                                      |
| Configs vitest/playwright/lighthouse presentes | ✅ (verificado en exploración de planeación)                                                                                                    |
| Sentry inerte sin DSN                          | ✅ `instrumentation-client.ts` + `src/lib/observability.ts`                                                                                     |
| Script `test` con `--coverage`                 | ⚠️ NO lo lleva (esperado — el kit lo omite para que la CI del commit inicial quede verde sin tests). Se añade en Fase 1 con los primeros tests. |

### Fricciones de kit / entorno detectadas

- **K1 — No hay runtime de contenedores local (Docker/Colima/Podman ausentes).** El plan usa
  `supabase start` (docker) para el stack local de Fase 1 (smoke de la RPC) y el e2e de Fase 3.
  - **Impacto:** CI funciona (ubuntu-latest trae Docker preinstalado → el job `e2e` con
    `supabase start` corre). **Local** no puede levantar el stack completo sin un runtime.
  - **Mitigación:** Fases 0–2 no lo necesitan (unit tests del engine son puros; la UI no toca
    BD). Para validar la migración/RPC en local y el e2e completo, se requiere **una** de:
    (a) instalar Docker Desktop o Colima; (b) adelantar el proyecto Supabase cloud (Fase 4 → antes)
    y correr migración + e2e contra él. Se decide con el usuario al llegar a la validación de
    Fase 1. No bloquea el arranque.

### Desviación del plan

- **RLS más estricta que el literal del plan del sprint.** El `SPRINT_001.md` describe «anónimo
  solo INSERT vía el flujo». La implementación usa una RPC `SECURITY DEFINER` y **no otorga
  ninguna política INSERT directa a `anon`** sobre las tablas (solo `EXECUTE` sobre la RPC). Es
  la misma garantía, por construcción más segura (imposible insertar saltándose la validación de
  consentimiento/rate-limit). Se documenta en el **ADR de datos** (`decisions/002-...`). El plan
  ya lo anticipa: «ADR de schema si difiere del propuesto».

- **K2 — `pnpm` bloquea toda la toolchain ante un build ignorado.** Al instalar el toolchain de
  Cloudflare, `workerd` (runtime, transitivo de `wrangler`/`opennext`) quedó como «decisión
  pendiente» de build y `pnpm` devolvió `ERR_PNPM_IGNORED_BUILDS` en cada `pnpm <script>`
  (typecheck/lint/test/build), rompiendo el flujo local y el CI.
  - **Resolución:** `workerd: false` + añadido a `ignoredBuiltDependencies` en
    `pnpm-workspace.yaml` (espejo de `@sentry/cli`). Su build nativo solo hace falta para
    `wrangler dev`/deploy (Fase 4); se reevalúa al desplegar. Toolchain restaurada.

### Decisiones

- **ADR 001 — Hosting:** Cloudflare Workers vía `@opennextjs/cloudflare`. Free tier permite uso
  comercial (Vercel Hobby no); OpenNext soporta Next 16; el «version trap» del issue
  `workers-sdk#13755` se evita por diseño (guard del panel en layout server, **sin** `proxy.ts`;
  route handlers en runtime `nodejs`, **sin** `edge`). Plan B (Vercel puente H1 / Vercel Pro)
  documentado, decisión de costo del usuario. Ver `decisions/001-hosting-free-tier-comercial.md`.

### Registro de avance

- 2026-07-15 — Rama `sprint-001/puerta-fundadora` creada desde `main`. Bitácora iniciada.
- 2026-07-15 — **Fase 0 completa.** Deps instaladas (gsap 3.15.0, @gsap/react 2.1.2, lenis
  1.3.25, @supabase/supabase-js, @supabase/ssr; dev: supabase CLI, @opennextjs/cloudflare,
  wrangler). `.env.example` ampliado (Supabase + operador + pepper). `coverage/**` y
  `.open-next/**` a los ignores de ESLint. ADR 001 escrito. `typecheck` + `lint` + `build`
  verdes.
