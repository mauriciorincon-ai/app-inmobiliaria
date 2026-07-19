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

- **Wizard:** paso 2 gana `<select>` Localidad (19 localidades de Bogotá, espejo TS del seed en
  `engine/zonas/localidades`) — resuelve `zona_id` para los cupos. Paso 3 gana **email opcional**
  (habilita lotes Brevo). Captura de `?ref=` de la URL → payload (código inválido se ignora).
  Etiqueta "Barrio o zona" → "Barrio" (ahora que hay Localidad). Schema + `construirPayload`
  actualizados (+ tests: 27 verdes).
- **Landing:** `BandaCupos` (client, carga tras montar → landing sigue LCP-estático). Solo aparece
  si hay cupo fijado; sin cupos, no renderiza nada (escasez REAL o no existe).
- **Referido:** `InvitaReferido` (compartido) en confirmación (vía `MagicLinkGuardar`) y mi-anuncio.
  Código on-demand, botón "Invitar por WhatsApp" (`wa.me/?text=`), conteo real. Copy honesto:
  atribución + red, sin escasez fabricada.
- **Vigencia (B3):** `RenovarVigencia` (POST `renovar_vigencia`, +60d) en mi-anuncio + página
  dedicada `/renovar`. Cron `.github/workflows/vigencia.yml` (semanal, service_role) + secret GH
  `SUPABASE_SERVICE_ROLE_KEY` seteado.
- e2e nuevo `campana.spec` (referido atribuido + renovación POST).

## Desviación del plan

- **`/renovar` con token en FRAGMENT (`#t=`), no `/renovar/[token]` en el path.** El plan escribía
  el path `[token]`, pero eso mete el token en la URL del servidor y sus logs — contra el principio
  del magic link (token solo en el fragment, jamás al servidor; ADR-004). Se implementó `/renovar`
  leyendo `#t=` en el cliente (igual que `/mi-anuncio`). Mismo comportamiento, sin fuga del token.
- **e2e de cupo-decrementa DIFERIDO a Fase 3:** fijar un cupo requiere el panel de zonas (Fase 3);
  en Fase 2 el motor `cupos` va cubierto por unit (100%) y la banda por su render condicional. El
  e2e "fijar cupo → publicar → contador baja" entra con el panel /operador/zonas.

## Fase 3 — C8 panel + PostHog

- **Panel multi-página** (mismo allowlist server-side): `/operador` (Registros) + `/operador/campana`
  (embudo real publicados→con-fotos→verificados · `EnviarLote`: plantilla → preview destinatarios →
  envío por tandas → log) + `/operador/zonas` (`FijarCupo` por localidad + densidad zona×tipo×rango).
  `PanelNav` compartido.
- **Envíos:** `engine/envios/plantillas` (3 plantillas deterministas, cifras SOLO citables) +
  `lib/brevo.ts` (API v3 por fetch, **mock sin key / con `BREVO_MOCK=1`**) + `POST /api/envios`
  (sesión de operador + zod + pino/reportError, tandas ≤300/día, "quedan N hoy").
- **PostHog:** `lib/posthog.ts` inerte sin key + funnel (`landing_vista`, `publicar_paso1`,
  `registro_publicado`) sin PII (zona/tipo/operación). Sin autocapture ni session recording,
  persistencia en memoria (Ley 1581).
- e2e `panel-campana` (cupo→banda en landing · lote mock→log) + unit de plantillas. Suite 161
  verde, cobertura 98%. e2e completo **60 verde LOCAL**.

### K11 — posthog-js infló el script budget de Lighthouse

La 1ª CI del PR #3 (Fases 0–2) falló `resource-summary.script.size` en `/` y `/publicar`: 413KB >
budget 350KB. Causa: `posthog-js` (~224KB) entró al bundle de CADA página vía el layout, aunque es
peso muerto sin key. **Fix:** `import("posthog-js")` DINÁMICO en `lib/posthog.ts` → sin key
(CI/lighthouse) el chunk pesado no se descarga (verificado: no aparece en ningún manifest estático).
En prod carga async tras montar, sin bloquear el LCP. `quality` + `e2e` de esa corrida ya en verde
(la migración 3 validó en CI sobre Postgres fresco).

## Fase 4 — B2 paquete fundador

(pendiente)

## Fase 5 — H2a G-Release

(pendiente)

## Fase 6 — Cierre de ciclo

(pendiente)

## Desviación del plan

(ninguna aún)
