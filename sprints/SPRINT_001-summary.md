---
sprint: 001
app: inmobiliaria
status: closed
opened: 2026-07-13
closed: 2026-07-15
branch: sprint-001/puerta-fundadora
pr: https://github.com/mauriciorincon-ai/app-inmobiliaria/pull/1
---

# Sprint 001 Summary — Innmobiliaria

## Outcome

**Sí (con validación de BD/e2e pendiente en CI).** Un vendedor recorre la landing seller-first,
entiende la promesa y deja su inmueble registrado como fundador en un flujo de 3 pasos (<3 min,
consentimiento Ley 1581); el operador lo ve en un panel protegido. El ADR de hosting comercial
free-tier quedó decidido. Todo lo validable sin contenedores está verde localmente; el stack
completo (Postgres real + happy-path e2e) se valida en el job `e2e` de CI al abrir el PR.

## Qué se construyó

- **Landing de expectativa** (`/`) seller-first sobre el sistema visual portado de la página base:
  Navbar, Hero (estático, LCP-safe, arte SVG), Dolores (cifras citables), ComoFunciona
  (publicar=registro), QueViene (teaser cualitativo), Faq accesible, CtaFinal, Footer.
- **Flujo publicar = registro** (`/publicar`): wizard de 3 pasos, paso 1 = 3 campos, validación
  zod por campo, persistencia en localStorage, honeypot + time-trap, estados de red/error.
- **Confirmación** (`/confirmacion`, stateless) y **Política de privacidad** (`/privacidad`, Ley 1581).
- **Panel del operador** (`/operador`): login password, guard server + allowlist de email, tabla
  con estados vacío/cargando/error/contenido.
- **Backend:** endpoint `POST /api/registro` (re-validación, anti-spam, IP hasheada, RPC),
  migración con RLS estricta + RPC `registrar_fundador` SECURITY DEFINER + rate-limit + `ping`.
- **Calidad:** motor con 44 unit tests (cobertura 100%), 4 specs e2e, CI con Supabase local,
  `design-system.md`, `MANUAL-DE-USO.md`, `GUIA-DE-PRUEBA.html`, ADRs 001 y 002.

## DoD — checklist (los 6+1 estándares)

- **Testing** — ✅ unit 44 (motor 100% cobertura, >80% exigido). e2e: happy path por la UI +
  validaciones + RLS negativa + axe (corren en CI; a11y + validaciones de UI ya verdes en local).
- **CI/CD** — ✅ 3 jobs (`quality`/`e2e`/`lighthouse`); `e2e` levanta Supabase local. Sin jobs
  nuevos → ruleset intacta. (Verde definitivo pendiente de la corrida del PR.)
- **Observabilidad** — ✅ Pino (request-id + timing por request) + Sentry vía `reportError`
  (metadata-only, inerte sin DSN).
- **Seguridad** — ✅ `pnpm audit` limpio (override de postcss); cero secrets (gitleaks bloqueó en
  vivo un password de prueba, se corrigió a generación aleatoria en CI); RLS por construcción +
  test negativo; rate limiting en `/api/registro`.
- **Performance** — ✅ LCP-estático verificado (h1 del hero y heading del paso 1 en el HTML
  prerenderizado, cero `opacity:0`); Lighthouse contra `perf-budget.json` en CI (4 rutas).
- **UX/A11y** — ✅ axe limpio en 5 rutas + 3 pasos (local); teclado con foco visible; labels
  reales en todos los inputs; contraste AA (se oscureció `--color-mute`).
- **IA embebida** — ✅ N/A (cero IA en fase 1).
- **Manual de uso** — ✅ `docs/MANUAL-DE-USO.md` (incluye cómo entra el operador).
- **Guía de prueba** — ✅ `docs/GUIA-DE-PRUEBA.html` (primera, acumulativa, prefijo `v1`, 19
  pruebas, 7 gate ⭐).
- **Revisión de diseño** — ⏳ PENDIENTE: checklist `diseno-ui` + aprobación visual del usuario
  sobre la preview.

## Métricas técnicas (acceptance criteria del SPRINT_001.md)

- Paso 1 con MÁXIMO 3 campos · ningún paso pide fotos/documentos — ✅.
- Sin consentimiento no hay envío; `consentimiento_at` lo fija el servidor — ✅ (schema + RPC).
- Cero cifras no citables ni contadores fabricados — ✅.
- LCP estático por CADA ruta nueva — ✅ verificado.
- Anónimo no puede leer datos (RLS con test) — ✅ (spec `rls.spec.ts`, corre en CI).
- Registro visible en el panel — ✅ (happy-path e2e, corre en CI).
- Recorrido móvil 360px <3 min — ⏳ gate manual del usuario (⭐ en la guía).

## Decisiones no anticipadas

- **ADR 001 — Hosting:** Cloudflare Workers vía OpenNext (free tier comercial; Vercel Hobby lo
  prohíbe). Evita el «version trap» de Next 16 por diseño (guard en layout server, sin `proxy.ts`;
  route handlers nodejs).
- **ADR 002 — Schema:** RPC `SECURITY DEFINER` en vez de INSERT directo de anon → RLS **más
  estricta** que el literal del plan (anon sin política sobre tablas, solo EXECUTE de la RPC).
- **Arte del hero por ilustración SVG** (no foto de la base) → elimina el bloqueo de licencia de
  imágenes.
- **`--color-mute` oscurecido** (#7b8190 → #6b7280) para cumplir contraste AA (gap de la base).

## Bugs + resoluciones

- **K1 — Sin runtime de contenedores local:** la migración/RPC/e2e-con-BD no se pudieron correr
  en local. Se validan en CI (Docker en ubuntu). Mitigado: a11y + validaciones de UI sí corrieron
  local; selectores del happy-path probados con los mismos patrones.
- **K2 — `pnpm` bloqueaba la toolchain** por el build ignorado de `workerd` → resuelto en
  `pnpm-workspace.yaml`.
- **gitleaks** detectó un password de prueba literal en `ci.yml` → se cambió a generación
  aleatoria en un step de CI (gate probado en vivo).
- **Foco de teclado invisible** en los radios `sr-only` de operación → anillo de foco en la
  etiqueta (hallazgo del self-review).
- **postcss moderate (audit)** → override a `>=8.5.10`.

## Qué salió bien / qué generó fricción

- **Bien:** el motor puro con tests fue rápido y sólido; el patrón LCP-estático se aplicó limpio;
  axe + validaciones de UI se validaron localmente sin BD; los gates (gitleaks, audit) atraparon
  problemas reales.
- **Fricción:** la ausencia de Docker local impidió cerrar el ciclo de validación de la capa de
  datos localmente; el primer contacto real con Postgres/RPC ocurre en CI.

## Sugerencias de mejora al método

- El régimen de la app asume validación local de Supabase (docker). Para máquinas sin runtime de
  contenedores, el método podría contemplar explícitamente "provisionar Supabase cloud temprano"
  o exigir Docker/Colima como prerrequisito del sprint con capa de datos.

## Deuda técnica aceptada

- **Validación de BD/e2e solo en CI** (K1) — pago: instalar Docker/Colima o provisionar Supabase
  cloud (sprint actual, antes del merge, o S2).
- **Sin tests de componente (Testing Library):** la UI se cubre por e2e + axe; cobertura enfocada
  en el motor. Pago: S2 si crece la lógica de UI.
- **Anti-spam devuelve 200 silencioso** ante time-trap: un usuario legítimo muy rápido podría no
  quedar registrado. Riesgo bajo (umbral 5 s). Pago: revisar si aparece en datos reales.
- **PostHog no cableado** (sin eventos de producto en S1). Pago: cuando haya funnel que medir.
- **Preview deploy pendiente de cuenta Cloudflare** (aprovisionamiento del usuario).

## Archivos clave (máx. 10)

1. `supabase/migrations/20260715000001_captacion_fundadores.sql` — schema + RLS + RPC.
2. `src/engine/registro/schema.ts` — contrato zod por paso + `construirPayload`.
3. `src/app/api/registro/route.ts` — endpoint (anti-spam + rate-limit + RPC).
4. `src/components/publicar/Wizard.tsx` — orquestador del flujo de 3 pasos.
5. `src/app/operador/page.tsx` — panel con guard + allowlist.
6. `src/components/landing/Hero.tsx` — hero estático (LCP-safe).
7. `src/components/ui/Campo.tsx` — campo accesible (label + error por campo).
8. `design-system.md` — sistema visual + cifras permitidas/prohibidas.
9. `decisions/001-hosting-free-tier-comercial.md` y `decisions/002-schema-captacion-rpc-rls.md`.
10. `docs/GUIA-DE-PRUEBA.html` — guía de prueba viva.

## Cómo probar

1. `pnpm install && pnpm test` (unit + cobertura) · `pnpm build`.
2. Con Docker: `pnpm exec supabase start` → `supabase status` (copiar URL/keys a `.env.local`) →
   `node scripts/crear-operador.mjs` → `pnpm dev` → recorrer landing → `/publicar` (3 pasos) →
   `/confirmacion` → `/operador` (login) y ver el registro.
3. Sin Docker: `pnpm dev` valida la UI (landing, wizard con validaciones/persistencia, páginas
   estáticas); la BD se ejercita en el job `e2e` de CI.
4. `pnpm exec playwright test` para el e2e completo (requiere Supabase local corriendo).
5. Seguir `docs/GUIA-DE-PRUEBA.html` (gate ⭐) en un teléfono real sobre la preview.
