# Sprint 003 — Bitácora de implementación · «La campaña encendida» + CIERRE DE CICLO

> Sprint 3 de 3 (ÚLTIMO del ciclo fase 1). Rama `sprint-003/campana-encendida`. Arranca H1,
> termina **H2a** (G-Release: la landing pública). Cero IA. Plan aprobado + «construye» 2026-07-18,
> modelo `opus[1m]`.

## Decisiones del usuario (gate de arranque + AskUserQuestion)

- **Email OPCIONAL en el paso 3** del wizard (habilita destinatarios Brevo; el paso 1 sigue con 3
  campos). Quien no lo dé publica igual; se le contacta por WhatsApp 1-a-1.
- **Vigencia 60 días** (renovación extiende +60). Equilibrio para un mercado que tarda 7–7,5 meses.

## Fase 0 — Setup + K1 (Colima)

- **K1 PAGADO ✅** — `brew install colima docker` + `colima start --cpu 4 --memory 6` (16GB RAM,
  10 CPU). Docker 29.5.2 vivo con macOS Virtualization.Framework. **Dos sprints de deuda saldados:**
  por primera vez el e2e corre contra Postgres real EN LOCAL, no solo en CI.
- **Delta kit v1.7.2 al skill local `testing-patterns`:** regla anti-flakiness 8 (specs Playwright =
  CommonJS, nada de `import.meta.url`; paths desde `process.cwd()`) + sección "Lighthouse solo
  páginas públicas" (rutas privadas/noindex/hidratadas FUERA de la auditoría; su LCP al gate ⭐;
  `throttlingMethod: devtools` descartado).
- **`.env.example`** ampliado: Brevo (`BREVO_API_KEY`/`BREVO_MOCK`/`BREVO_FROM_*`) + PostHog
  (`NEXT_PUBLIC_POSTHOG_KEY`/`_HOST`).
- Dep nueva: `posthog-js` (inerte sin key).

### Fricciones que K1 cazó EN LOCAL (su valor exacto — antes se pagaban en CI)

- **Colima + `vector`/docker.sock:** `supabase start` fallaba porque el contenedor `vector`
  (analytics/logs) monta el `docker.sock` y Colima+virtiofs no lo soporta (`operation not
supported`). Fix: `[analytics] enabled = false` en `supabase/config.toml` (no lo usan tests ni CI).
- **Gate de builds de pnpm 11 (`core-js`):** al añadir `posthog-js` entró `core-js` con build
  script; pnpm auto-escribió `core-js: set this to true or false` en `pnpm-workspace.yaml` (valor
  inválido) y el chequeo `verify-deps-before-run` de `pnpm exec` fallaba con exit 1 (habría roto
  CADA `pnpm exec`/`run` en CI). Fix: `core-js: false` en `allowBuilds` + `ignoredBuiltDependencies`
  (la config va en `pnpm-workspace.yaml`, NO en `package.json` — pnpm 10.4+).
- **Flake a11y dev-only (`document-title`):** la ficha `/i/[slug]` se alcanza por navegación cliente
  (Link) y en `next dev` el `<title>` del `generateMetadata` se aplica con retraso → axe cazaba
  `document-title` (serious). En prod/SSR (CI) ya viene servido, por eso CI pasaba. Fix robusto:
  `await expect(page).toHaveTitle(/Innmobiliaria/i)` antes de axe. **Ejemplo canónico del valor de
  K1:** un defecto de experiencia que solo aparece en dev y la CI de prod jamás vería.

### Verificaciones (supuestos)

- **e2e S1+S2 VERDE en local (52/52)** contra Postgres real — primera vez en el pipeline.
- **Gate gitleaks VIVO:** carnada canónica `AKIAQ7RTZ4PXKM2WNB3S` → hook exit 1 (bloquea); sin
  carnada exit 0. Verificado con el exit real, no un "todo bien".
- **Custom domain en Workers free:** capacidad documentada por Cloudflare; verificación en vivo se
  hace en la Fase 5 (necesita el dominio comprado).
- **PostHog sin PII:** trivial por construcción (controlamos las props) — se implementa y verifica
  en la Fase 3.
- **Entorno e2e local:** `.env.development.local` (gitignored) con Supabase local + R2 dummy +
  flags — sobreescribe `.env.local` (cloud) solo en `next dev`, sin tocar la config de deploys.

## Fase 1 — Migración 3 + motores

- **Migración `20260719000001_campana.sql`** (validada LIMPIA en local con `db reset` — el valor de
  K1: en S2 esto solo se podía en CI):
  - Tablas: `zonas` (+seed 19 localidades de Bogotá, sin cupo), `referidos` (código base64url 8
    chars), `envios` (log de lotes). Columnas: `inmuebles.{zona_id, vigente_hasta (60d), vigente}`
    - `vendedores.referido_por_codigo`.
  - RPCs públicas (anon+auth): `obtener_cupos` (solo zonas con cupo), `obtener_codigo_referido`
    (crea el código on-demand, estable), `obtener_mis_referidos` (conteo sin exponer al referido),
    `renovar_vigencia` (POST, +60d). `registrar_fundador` DROP+CREATE (+p_ref default null +
    zona_id + vigencia). `obtener_ficha`/`obtener_mi_anuncio` create-or-replace (ficha DERIVA
    vigencia → vencido desaparece al instante; mi-anuncio expone vigente_hasta).
  - RPCs operador (SOLO auth): `fijar_cupo`, `obtener_zonas_panel`, `obtener_densidad` (zona×tipo×
    rango), `obtener_lote` (destinatarios con email), `registrar_envio`. Cron (SOLO service_role):
    `marcar_vencidos`. Patrón K5/K6 de grants (do $$ foreach + revoke/grant explícitos).
  - **Smoke funcional local:** todas las públicas 200 (registro→slug+token, código estable, renovación
    +60d); las auth/cron-only **deniegan a anon** (401/42501). Modelo de seguridad verificado en vivo.
- **Motores puros** `engine/{cupos,referidos,vigencia}` + 43 unit tests. Suite total **148 verdes,
  cobertura 98%** (>80).
- **`lib/supabase/types.ts`** sincronizado (3 tablas, 3 columnas, 10 RPCs, tipos de respuesta).

## Fase 2 — C7 + B3 UI

(pendiente)

## Fase 3 — C8 panel + PostHog

(pendiente)

## Fase 4 — B2 paquete fundador

(pendiente)

## Fase 5 — H2a G-Release

(pendiente)

## Fase 6 — Cierre de ciclo

(pendiente)

## Desviación del plan

(ninguna aún)
