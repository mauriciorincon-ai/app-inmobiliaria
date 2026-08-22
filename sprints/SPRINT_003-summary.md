---
sprint: 003
app: inmobiliaria
status: closed
opened: 2026-07-18
closed: 2026-08-22
branch: sprint-003/campana-encendida
pr: https://github.com/mauriciorincon-ai/app-inmobiliaria/pull/3
retroactivo: true # escrito el 2026-08-22 desde la bitácora + git log, a pedido de la planeadora
gate_estrella: aplazado al acto 2 — F0 #8, método v1.20.0
---

# Sprint 003 Summary — Innmobiliaria

> **Summary RETROACTIVO.** El PR #3 se mergeó el 2026-08-22 **estando en la fase 4 de 6**: las
> fases 5 (H2a G-Release) y 6 (cierre de ciclo) nunca se ejecutaron, y con ellas se saltó este
> summary. Se reconstruye desde `sprints/SPRINT_003-implementation-log.md` y el `git log` del
> PR, sin inventar nada: lo que no se hizo se declara como no hecho.

## Outcome

**Parcial (2 de 3).** O1 y O2 se cumplieron completos y están en `main`; **O3 no se ejecutó** —
la campaña NO quedó pública y el ciclo NO cerró formalmente.

- **O1 · La escasez y el referido son REALES — ✅ CUMPLIDO.** Cupos por zona operables desde el
  panel (contador = cupo fijado − publicados reales; **sin cupo fijado no hay contador**), link
  de referido por WhatsApp con atribución en BD, y B3 anti-zombie con vigencia de 60 días
  renovable por POST desde el magic link.
- **O2 · El operador dirige la campaña completa — ✅ CUMPLIDO.** Panel de campaña con embudo
  real, envíos por lotes vía Brevo (3 plantillas), densidad por zona×tipo×rango, PostHog sin
  PII, y el paquete fundador B2 con sus 4 guías.
- **O3 · H2a G-Release + cierre de ciclo — ❌ NO EJECUTADO.** Sin dominio propio, `noindex`
  sigue activo, sin responsable Ley 1581 real, sin Sentry con DSN, sin `sitemap`/`robots`, sin
  `/terminos` ni `/accesibilidad`, sin `BLUEPRINT.html` y sin guía v3. **La campaña no está
  pública.**

## Qué se construyó

**Migración 3** (`20260719000001_campana.sql`): tablas `zonas` (+seed de las 19 localidades),
`referidos` y `envios`; columnas `inmuebles.{zona_id, vigente_hasta, vigente}` y
`vendedores.referido_por_codigo`. 13 RPCs nuevas con `SECURITY DEFINER` + grants explícitos:
públicas (`obtener_cupos`, `obtener_codigo_referido`, `obtener_mis_referidos`,
`renovar_vigencia`), de operador (`fijar_cupo`, `obtener_zonas_panel`, `obtener_densidad`,
`obtener_lote`, `registrar_envio`) y de cron (`marcar_vencidos`, solo `service_role`).
`registrar_fundador` recreada con zona, vigencia y atribución de referido; `obtener_ficha`
DERIVA la vigencia (el vencido desaparece al instante, aunque el cron no haya corrido).

**Motores puros:** `engine/{cupos,referidos,vigencia,zonas,envios}`.

**UI del vendedor:** banda de cupos en la landing (solo si hay cupo fijado), `InvitaReferido`
(confirmación y mi-anuncio), `RenovarVigencia` + página `/renovar`, `PaqueteFundador` con las
4 guías HTML autocontenidas en `public/paquete-fundador/`. Wizard: `<select>` de Localidad,
correo **opcional** en el paso 3 y captura de `?ref=`.

**Panel del operador:** `/operador/campana` (embudo + `EnviarLote`) y `/operador/zonas`
(`FijarCupo` + densidad), con `PanelNav` compartido. `POST /api/envios` con allowlist de
operador, zod y tandas ≤300/día. `lib/brevo.ts` (API v3 por fetch, con mock) y `lib/posthog.ts`
(inerte sin key, sin autocapture ni grabación, persistencia en memoria).

**Cron** `.github/workflows/vigencia.yml` (semanal, `service_role`).

## DoD — checklist (los 6+1)

| Estándar             | Estado | Evidencia                                                                                                     |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| **Testing**          | ✅     | 161 unit/componente (cobertura 98% del motor, umbral 80) + 60 e2e verdes contra Postgres real, local y en CI. |
| **CI/CD**            | ✅     | PR #3 con `quality`/`e2e`/`lighthouse` en conclusión propia `success` (run 29668565491).                      |
| **Observabilidad**   | 🟡     | PostHog cableado y Sentry client-only del kit; **sin DSN activo** — quedó en la fase 5 no ejecutada.          |
| **Seguridad**        | ✅     | RLS + RPCs con grants explícitos; anon denegado (401/42501) verificado en vivo; gitleaks vivo con la carnada. |
| **Performance**      | ✅     | Lighthouse verde contra `perf-budget.json` tras el fix K12.                                                   |
| **UX + A11y**        | ✅     | axe sin violaciones en las rutas nuevas; labels reales; `prefers-reduced-motion`.                             |
| **IA responsable**   | N/A    | Cero IA en fase 1 (regla de dominio). Ninguna dependencia de LLM.                                             |
| **Cierres de ciclo** | ❌     | `BLUEPRINT.html`, guía v3, design-sync y gate ⭐ **no se ejecutaron** (fase 6).                               |

## Métricas técnicas

| Métrica                   | Objetivo   | Real             |     |
| ------------------------- | ---------- | ---------------- | --- |
| Cobertura del motor       | >80%       | **98%**          | ✅  |
| Unit + componente         | —          | **161**          | ✅  |
| e2e                       | ≥1/feature | **60**           | ✅  |
| Lighthouse vs presupuesto | verde      | verde (tras K12) | ✅  |
| Campaña pública (H2a)     | sí         | **no**           | ❌  |

## Decisiones no anticipadas

**Los ADRs 007–009 previstos NUNCA se escribieron** (`decisions/` llega hasta el 006): iban en la
fase 6. Las decisiones sí se tomaron y quedaron registradas en la bitácora — se listan aquí para
que no se pierdan, y su promoción a ADR queda como deuda:

1. **Vigencia de 60 días con doble defensa** (decisión del usuario): la ficha DERIVA la vigencia
   —el vencido desaparece al instante— y el cron semanal solo marca el estado para panel y lotes.
   Nada muta por GET; renovar es POST.
2. **`/renovar` con el token en el FRAGMENT (`#t=`), no en el path.** El plan escribía
   `/renovar/[token]`, pero eso mete el token en la URL del servidor y sus registros, contra el
   principio del magic link (ADR-004). **Desviación del plan, anotada en la bitácora.**
3. **Correo opcional en el paso 3** (decisión del usuario): habilita los lotes de Brevo sin tocar
   el paso 1, que sigue con 3 campos.
4. **Paquete fundador servido desde `public/`** en vez de `docs/` + copia en prebuild: mismo
   resultado (archivo del repo), sin script de copia. Desviación menor, anotada.

## Bugs + resoluciones

1. **K12 — Lighthouse rojo por `script.size` (414032 B > 358400).** El fix previo de posthog
   (import dinámico) era correcto pero **insuficiente**. La causa real: `BandaCupos` metía
   `@supabase/supabase-js` (~63 KB gz) en la landing, y **el prefetch de rutas de Next lo
   propagaba a `/publicar`** — de ahí el número idéntico en ambas. Fix: `rpcPublico` (fetch
   nativo contra `/rest/v1/rpc`, cero dependencias) para la lectura anónima de cupos. Bajó a
   349353 B. Diagnosticado con una reproducción CDP de la métrica de Lighthouse.
2. **Colima + `vector`/docker.sock:** `supabase start` fallaba porque el contenedor de analytics
   monta el `docker.sock` y Colima+virtiofs no lo soporta. Fix: `[analytics] enabled = false`.
3. **Gate de builds de pnpm 11 (`core-js`):** pnpm auto-escribió un valor inválido en
   `pnpm-workspace.yaml` y rompía CADA `pnpm exec`. Fix: `core-js: false` explícito. (La config
   va en `pnpm-workspace.yaml`, **no** en `package.json`.)
4. **Flake de a11y solo en dev (`document-title`):** la ficha se alcanza por navegación cliente y
   en `next dev` el `<title>` del `generateMetadata` llega tarde. Fix: esperar el título antes de
   axe. **Ejemplo canónico del valor de K1**: un defecto que la CI de producción jamás vería.

## Qué salió bien / qué generó fricción

**Bien — K1 (Colima) se pagó con creces.** Por primera vez en el pipeline el e2e corrió contra
Postgres real **en local**: la migración se validó con `db reset` antes de tocar CI, y cazó tres
fricciones (vector/docker.sock, el gate de builds de pnpm, el flake de a11y) que antes se habrían
pagado en corridas de CI.

**Fricción — el merge prematuro.** El PR se mergeó en fase 4 de 6. Consecuencias reales y
medibles: el MANUAL quedó desactualizado (lo descubrió y lo pagó la entrega del brochure, un mes
después), no hay BLUEPRINT, no hay guía v3, no hay ADRs 007–009, y este summary hubo que
reconstruirlo retroactivamente. **Sin summary, la planeadora se quedó sin insumo de
retrospectiva durante un mes.**

**Fricción — el presupuesto de Lighthouse castiga dependencias en la landing.** Meter el cliente
de Supabase en una página LCP-crítica costó dos rondas de CI. El patrón `rpcPublico` (fetch
nativo para lecturas anónimas) queda como el camino por defecto.

## Sugerencias de mejora al método

1. **Un sprint no se mergea por fases.** El merge debería exigir la DoD completa o declarar
   explícitamente el corte y **abrir la deuda en el mismo acto**. Aquí el corte fue silencioso y
   la deuda solo salió a la luz un mes después, al construir el brochure.
2. **El summary debería ser condición de merge, no de cierre.** Es lo que la planeadora lee; sin
   él, el sprint queda invisible aunque el código esté en `main`.
3. **Patrón nuevo para el kit — `rpc-publico-sin-cliente`:** para lecturas anónimas de solo
   lectura en páginas LCP-críticas, `fetch` nativo contra PostREST en vez del cliente completo.
   Ahorra ~63 KB gz y evita que el prefetch contamine páginas vecinas.
4. **Vigilar el prefetch de Next al medir presupuestos:** dos páginas pueden fallar con el mismo
   número porque cada una precarga a la otra. Sin eso, el diagnóstico apunta al lugar equivocado.

## Deuda técnica aceptada

| Deuda                                                                                              | Por qué                                                           | Cuándo se paga                                       |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| **G-Release completo** (dominio, `noindex`, Sentry, `/terminos`, `/accesibilidad`, sitemap/robots) | Fase 5 no ejecutada; requiere compra de dominio del usuario       | Próximo sprint — **bloquea recibir usuarios reales** |
| **`docs/BLUEPRINT.html`**                                                                          | Fase 6 no ejecutada                                               | Rumbo al acto 2                                      |
| **Guía de prueba v3 (acumulativa)**                                                                | Fase 6 no ejecutada                                               | **Antes del gate ⭐** — es su insumo                 |
| **ADRs 007–009**                                                                                   | Fase 6 no ejecutada; las decisiones están en la bitácora y arriba | Cuando se retome el cierre                           |
| **Gate ⭐ acumulado S2+S3**                                                                        | **No es deuda: aplazado al acto 2** (F0 #8, método v1.20.0)       | Cuando el usuario decida, sin fecha                  |

## Archivos clave

1. `supabase/migrations/20260719000001_campana.sql` — la migración 3 entera.
2. `src/engine/{cupos,referidos,vigencia}/` — los motores puros del sprint.
3. `src/lib/supabase/rpc-publico.ts` — el patrón que salvó el presupuesto de la landing.
4. `src/components/landing/BandaCupos.tsx` — la escasez real (o nada).
5. `src/components/vigencia/RenovarVigencia.tsx` + `src/app/renovar/page.tsx` — el anti-zombie.
6. `src/components/referido/InvitaReferido.tsx` — el referido con atribución.
7. `src/app/operador/campana/page.tsx` + `src/app/operador/zonas/page.tsx` — el panel de campaña.
8. `src/lib/brevo.ts` + `src/app/api/envios/route.ts` — los envíos por lotes.
9. `src/lib/posthog.ts` — el funnel sin PII (y el import dinámico de K12).
10. `public/paquete-fundador/*.html` — las 4 guías del paquete fundador.

## Cómo probar

Con Colima arriba y `.env.development.local` cargado:

```bash
set -a; . ./.env.development.local; set +a
pnpm exec supabase start
pnpm exec supabase db reset && node scripts/crear-operador.mjs
pnpm test        # unit + componente
pnpm test:e2e    # e2e contra Postgres real
```

El recorrido manual de las features de S3 **todavía no está escrito**: la guía sigue en v2 y su
v3 es la deuda que habilita el acto 2.
