# kit-app — CHANGELOG

> Las apps ya estampadas NO se actualizan solas: el delta relevante se anota en la orden de
> construcción de su siguiente sprint.

## v1.6.2 — 2026-07-13 (G-Metodo: gate de arranque — aprobar el plan ≠ arrancar la construcción)

Fuente: fricción reportada por el usuario al preparar el arranque del S1 de Innmobiliaria — la
aprobación del plan en plan mode disparaba la construcción de inmediato, sin espacio para fijar
modelo/esfuerzo (`/model`) ni ajustes finales. Aprobado en bloque 2026-07-13 — detalle en
`entrega/2026-07-13-propuesta-gmetodo-gate-de-arranque.md`.

- **Command `plan-sprint` — paso 7 dividido en 7+8:** la aprobación del plan significa SOLO "el
  plan es correcto"; el paso 8 es el **gate de arranque**: bloque con recomendación de modelo y
  esfuerzo para el sprint (por fase si difiere) + recordatorio `/model` + espera de la palabra
  explícita **«construye»**. Prohibido crear/editar archivos antes.
- **CLAUDE.md § Workflow (Apertura):** regla espejo (aplica aunque el builder no entre por la
  skill).
- **Fuera del kit (mismo batch):** `portafolio/_template/ordenes/ORDEN.md` § Prompt de arranque
  declara el contrato en el prompt pegable — así el gate opera TAMBIÉN en las apps ya estampadas
  (el contrato viaja en cada orden nueva); enmienda en vuelo a la orden S1 de inmobiliaria.

## v1.6.1 — 2026-07-12 (G-Metodo del cierre habla S2: la CI verifica el comportamiento, no la experiencia)

Fuente: `sprints/SPRINT_002-summary.md` de app-habla (§ EL GATE DEL USUARIO: 4 defectos que 187
tests no vieron, todos de la misma familia). Aprobado en bloque por el usuario 2026-07-12 —
detalle en `entrega/2026-07-12-propuesta-gmetodo-cierre-habla-s2.md`; patrón completo en
`wiki/patterns/la-ci-verifica-comportamiento-no-experiencia.md`.

- **Skill `testing-patterns` — 3 reglas anti-"comportamiento sin experiencia":** (1) por cada
  pantalla, ≥1 e2e llega POR LA UI, no solo por `goto(url)`; (2) todo copy que AFIRMA una
  métrica tiene test que confronta la frase con la definición de la métrica; (3) los fixtures
  sintéticos incluyen casos FUERA del rango que el código asume (el test no puede validar el
  supuesto que comparte con el código).
- **Command `deploy-check`:** Lighthouse a mano es `npx @lhci/cli` — `npx lhci` a secas es un
  paquete impostor del registry.
- **CLAUDE.md regla 11:** referencia de implementación de la guía acumulativa →
  `app-habla/docs/GUIA-DE-PRUEBA.html` (S2).
- **Fuera del kit (mismo batch):** header de `estandares/estandares.md` alineado a v2.2.0
  (K-habla-5: la cita fija envejece).

## v1.6.0 — 2026-07-12 (G-Metodo: guía ACUMULATIVA + código primero + kit de prueba — directiva del usuario)

Fuente: directiva del usuario 2026-07-12, detectada construyendo habla S2 (una guía comprimida
despachaba con "todo como antes" un juego cuyo motor cambió por dentro — el gate habría pasado
sin probarlo). Detalle: `entrega/2026-07-12-propuesta-gmetodo-guia-acumulativa-y-codigo-primero.md`.

- **`docs/GUIA-DE-PRUEBA.html` REESCRITA — de "viva" a "viva y ACUMULATIVA" (bola de nieve):**
  la última versión contiene TODAS las pruebas vigentes; el sprint N hereda ENTERAS las del N−1
  (jamás "verificar que sigue funcionando"). Cada prueba lleva su **origen en su línea** —
  `Nuevo · SN` · `Mejorado en SN` · `SN` (heredada ⇒ regresión) — con **filtros** (Todo · Lo que
  cambió · **Gate mínimo ⭐**). El gate mínimo tiene criterio FIJO: solo lo que ninguna
  automatización puede verificar (hardware/mic/voz reales, juicio sobre contenido, aprobación
  visual); lo que la CI respalda queda fuera. **Namespace de `localStorage` versionado por
  sprint** (una regresión sin correr no aparece marcada por el sprint anterior). Historial de la
  guía en el pie (pruebas eliminadas solo con feature muerta, declaradas). Callout **kit de
  prueba** (`docs/kit-de-prueba/`).
- **CLAUDE.md del kit — regla 11 reescrita** (todo lo anterior) **+ regla 13 nueva: código
  primero, IA generativa después** — toda funcionalidad nativa interna se resuelve con
  programación (código/librerías/algoritmos) antes de acudir a IA generativa; feature LLM exige
  ADR "código primero"; la IA es acento con fallback, jamás columna vertebral.
- **Fuera del kit (mismo batch):** `estandares/estandares.md` v2.2 (DoD + precondición código
  primero en el estándar 7) · `metodo/metodo.md` v1.6.0 · `CLAUDE.md` de la planeadora
  (principios 6 y 7) · plantillas ORDEN y SPRINT · **enmienda en vuelo a la orden del S2 de
  habla** (sprint abierto — el caso que parió la regla).
- **Delta para ds/nutri-kids/hoja-de-vida:** su primera `GUIA-DE-PRUEBA.html` nace acumulativa
  con esta plantilla (va en la orden de su próximo sprint con UI).

## v1.5.1 — 2026-07-12 (G-Metodo del cierre habla S1: el kit contra su primer estampado del stack nuevo)

Fuente: `sprints/SPRINT_001-{summary,implementation-log}.md` de app-habla (K-habla-1..4, todo con
números). Aprobado en bloque por el usuario 2026-07-12 — detalle en
`entrega/2026-07-12-propuesta-gmetodo-cierre-habla-s1.md`.

- **perf-budget.json:** script **300→350 KB** — el framework solo (Next 16 + React 19) pesa
  ~246 KB gz; 300 era una multa a la primera feature (habla se rompió con 1,1 KB propios).
  TBT/LCP/CLS intactos como guardias reales.
- **README regla 5:** sesgo Lantern MEDIDO (LCP real 24 ms vs Lantern ~3380 ms) + criterio de
  renegociación por ADR (precedente ×2) + `throttlingMethod: devtools` como opción si hay 3er caso.
- **vitest.config.ts:** el umbral 80% de motores cubre `src/{engine,lib}/**` + advertencia de
  ajustar el glob al layout de CADA app en la verificación del kit (K-habla-1).
- **Skills `accessibility-wcag` + `diseno-ui`:** regla "el gate recorre TODAS las paletas"
  (el axe mono-tema de habla dejó pasar un 3.1:1 en modo oscuro).
- **Plantilla ORDEN (planeadora):** la versión del kit se cita como la vigente al estampar
  (K-habla-2: la orden decía v1.3.1, el estampado real fue v1.4.0).

## v1.5.0 — 2026-07-12 (G-Metodo: dos reglas duras de ENTREGABLES — directiva del usuario)

Fuente: directiva del usuario 2026-07-12, **ya aplicada y validada en app-habla S1** (su CLAUDE.md
reglas 10–11 + `docs/GUIA-DE-PRUEBA.html`). Detalle:
`entrega/2026-07-12-propuesta-gmetodo-entregables.md`.

- **`docs/GUIA-DE-PRUEBA.html` (NUEVO en el kit):** plantilla de la **guía de prueba viva** —
  entregable **estándar de todo sprint con UI**. HTML **autocontenido** (cero CDNs, cero
  dependencias; casillas persistidas en `localStorage`; modo claro/oscuro), organizada por
  **bloques** con *qué probar · cómo · qué resultado esperar*, tabla de valores correctos y
  callout "repórtame sí o sí". **Viva, no acumulativa:** cada sprint agrega lo nuevo, complementa
  y **elimina lo que ya no aplica**. Doble propósito: gate de prueba del usuario + entregable a
  usuarios finales. Referencia de implementación: `app-habla/docs/GUIA-DE-PRUEBA.html` (S1).
- **CLAUDE.md del kit — regla 11:** la guía de prueba viva es obligatoria en todo sprint con UI.
- **CLAUDE.md del kit — regla 12:** **PROHIBIDO entregar por artifacts de Claude o cualquier
  plataforma externa.** Todo entregable (guías, reportes, documentos visuales) es un **archivo del
  repo** —HTML autocontenido o Markdown— que el usuario pueda abrir, versionar y llevarse. Sin
  excepciones, ni "para verlo rápido".
- **Fuera del kit (mismo batch):** `estandares/estandares.md` → DoD + regla de entregables (v2.1);
  plantillas de orden y de sprint de la planeadora; `CLAUDE.md` de la planeadora.
- **Delta para las 3 apps ya estampadas** (ds, nutri-kids, hoja-de-vida): se anota en la orden de
  su próximo sprint (política del kit) — la primera vez que toquen UI deben crear su
  `GUIA-DE-PRUEBA.html`. app-habla ya la tiene.

## v1.4.0 — 2026-07-11 (G-Metodo del `/nueva-app habla`: estampado en macOS)

Fuente: primer `/nueva-app` corrido en el Mac (habla). El script canónico era Windows-only
(`estampar-app.ps1`, rutas `C:\Code\`) — las 3 apps previas se estamparon en Windows antes de la
migración (2026-07-10). Aprobado en G-Metodo por el usuario 2026-07-11 — detalle en
`entrega/2026-07-11-propuesta-gmetodo-estampado-macos.md`.

- **`estampar-app.sh` (nuevo):** puerto fiel del `.ps1` a bash (macOS/Linux) — misma secuencia y
  mismas lecciones (allowBuilds de pnpm 11, exit-code por paso vía `set -euo pipefail`, hook
  100755 en el índice K12, `prepare` self-healing, ruleset con checks día 0). Usa `jq` para editar
  `package.json` y `rsync` para copiar el kit. **Vía vigente del pipeline** (el `.ps1` queda para
  la estación Windows de respaldo hr02).
- **Mejora incorporada al flujo (ambos scripts la tendrán; el `.sh` ya):** el estampado escribe
  `.claude/settings.local.json` con `additionalDirectories=[<planeadora>]` — **conexión fija a la
  planeadora automatizada** (antes era paso manual del reporte final; memoria `arranque-app-en-vscode`).
- **`gitignore.plantilla`:** añade `.claude/settings.local.json` — cierra el fleco de la migración
  (app-ds lo tenía a mano; el kit no) para que toda app futura nazca protegida en cualquier máquina.
- **README:** sección de estampado con las dos vías (mac/win) + nota de paridad de scripts.
- **Deuda declarada:** el `.ps1` no recibió aún el paso de `settings.local.json` (divergencia
  anotada; se salda cuando toque estampar en Windows).
- **✅ VALIDADO en el estampado de habla (2026-07-11):** los 10 pasos pasaron sin una sola
  fricción a la primera (Next 16.2.10; commit inicial escaneado por gitleaks — hook vivo K12;
  repo público + ruleset día 0; 46 archivos, cero datos; `settings.local.json` gitignored y no
  pusheado). El puerto macOS queda confirmado ×1.

## v1.3.1 — 2026-07-11 (G-Metodo del cierre S3 ds: K12 — el hook nace ejecutable)

Fuente: `sprints/SPRINT_003-{summary,implementation-log}.md` de app-ds. El gate local de
gitleaks nunca corrió en S1–S3 (hook estampado 100644 — git ignora hooks no ejecutables EN
SILENCIO — y `core.hooksPath` por-clon perdido en los re-clones de la migración al Mac; las 3
apps afectadas, ds pagada en su S3). Aprobado en bloque por el usuario 2026-07-11 — detalle en
`entrega/2026-07-11-propuesta-gmetodo-cierre-ds-s3.md`.

- **githooks/pre-commit:** commiteado **100755** en el kit (`update-index --chmod=+x`) — todo
  estampado futuro copia un hook ya ejecutable.
- **estampar-app.ps1:** §5 inyecta script **`prepare`** = `git config core.hooksPath githooks`
  (self-healing en cada `pnpm install`, sobrevive re-clones); §6 `update-index --chmod=+x` tras
  el add (blinda el modo aunque el host sea Windows).
- **README/CLAUDE.md (regla 7):** hook 100755 + prepare + verificación "si un secreto de prueba
  no es bloqueado, el gate está muerto".
- **Plantilla de orden (planeadora):** el kit-check exige hooks ejecutables y **ACTIVOS**, no
  solo presentes.
- Apps existentes: fix manual por repo (4 comandos, sección 6 de la propuesta) — ds ✅ (S3);
  hoja-de-vida y nutri-kids pendientes del usuario.

## v1.3.0 — 2026-07-10 (G-Metodo: protección GitHub no negociable — checks requeridos día 0)

Fuente: directiva del usuario 2026-07-10 (aprobada en bloque) — detalle en
`entrega/2026-07-10-propuesta-gmetodo-mvp-dos-horizontes.md`.

- **estampar-app.ps1:** la ruleset `main-protegida` nace con la regla `required_status_checks`
  (`quality`/`e2e`/`lighthouse`, `strict: false`) — antes los checks quedaban "para después del
  primer CI verde" y ese después era un pendiente manual eterno. Echo final actualizado.
- **CLAUDE.md regla 6 + repo-app.md:** repo público (GitHub Free solo aplica rulesets en
  públicos) + checks requeridos desde el estampado; **si un sprint añade un job de CI (p. ej.
  `integration`), se añade a la ruleset en el mismo sprint**. Repo privado exigiría upgrade de
  plan por decisión F0 — la protección no se sacrifica.
- Las rulesets de las 3 apps existentes (hoja-de-vida, nutri-kids, ds) se corrigieron por API el
  mismo día (no esperan a su siguiente orden: es configuración de GitHub, no código del repo).

## v1.2.2 — 2026-07-10 (G-Metodo del cierre S2 ds: el estándar 7 tocó la realidad)

Fuente: `sprints/SPRINT_002-summary.md` de app-ds (estreno completo del estándar 7 + validación
contra Groq real). Aprobado en bloque por el usuario 2026-07-10 — detalle en
`entrega/2026-07-10-propuesta-gmetodo-cierre-ds-s2.md`. Solo reglas de skill; cero código nuevo.

- **`ia-embebida.md` §7 (nueva) — Contacto con la realidad:** validar el circuito con **key real
  ANTES del merge** del sprint que estrena/cambia proveedor (CI sigue en mock). Documenta las 5
  clases de fallo que solo el proveedor real muestra (structured outputs varía POR MODELO ·
  presupuestos de modelos de razonamiento · diacríticos vs matching literal · el LLM frasea lo
  que no conoce · varianza del Grader).
- **`ia-embebida.md` §6 (nueva) — El fallback SE ANUNCIA:** degradar nunca en silencio — motivo
  en cubetas honestas + reintento iniciado por el usuario, jamás retries automáticos.
- **`ia-embebida.md` §1:** schemas de ENTRADA de routes con **`.strict()`** (el default de Zod
  acepta-y-descarta en silencio) · en cliente, `schemas.ts` solo con **`import type`** (un import
  runtime mete zod al bundle y revienta el budget de la landing).
- **Checklist del sprint:** +3 ítems verificables por `/deploy-check` (proveedor real pre-merge ·
  fallback anunciado · strict/import-type).
- **`repo-app.md`:** bullet transversal `.strict()` en toda entrada de route (aplica más allá
  de IA).

## v1.2.1 — 2026-07-09 (G-Metodo del cierre S1 ds: Sentry promovido + fricciones K6–K12)

Fuente: `sprints/SPRINT_001-summary.md` de app-ds + estampado de ds. Aprobado por el usuario
2026-07-09 — detalle en `entrega/2026-07-09-propuesta-gmetodo-cierre-ds-s1.md`.

- **Sentry PROMOVIDO al kit (validado ×2: nutri-kids S1 + ds S1):** `instrumentation-client.ts`
  (client-only, metadata-only, **inerte sin `NEXT_PUBLIC_SENTRY_DSN`** — cero ruido en CI) +
  `src/lib/observability.ts` (`reportError`: tipos+metadatos, jamás mensajes crudos) +
  `.env.example`. El script instala `@sentry/nextjs` y deja el build script de `@sentry/cli`
  ignorado en `pnpm-workspace.yaml` (K12 — no subimos source maps). `observability.md`
  actualizado (antes decía "NO viene cableado"). Server-side por ADR cuando haya backend.
- **`vitest.config.ts` (K6/K8):** coverage `include` con `**/*.ts` (v8 tronaba parseando
  `.gitkeep`) + umbral **80% para `src/engine/**`** (regla 2 del CLAUDE.md, antes solo el piso 70).
- **K7 documentado como paso de setup:** el script `test` estampado sigue sin `--coverage` (CI
  verde día 0 sin tests); CLAUDE.md regla 2 y el comentario del config instruyen añadirlo al
  escribir los primeros tests. K9/K10 (eslint lintea `coverage/` y assets generados en `public/`)
  documentados en CLAUDE.md regla 2 — el `eslint.config.mjs` es del scaffold y no se parchea a ciegas.
- **`repo-app.md`:** patrón nuevo — workers ESM/WASM (Pyodide) se sirven desde `public/` como
  module workers, no se bundlean (Turbopack los degrada a clásicos; K11 de ds S1). Enlace al
  patrón de la planeadora.
- **CLAUDE.md § Stack:** default "Next.js 15" → **"Next.js 16+ (lo que estampe create-next-app)"**
  (drift confirmado ×2).
- **estampar-app.ps1:** el echo final ya no pide crear proyecto de Claude Design (contradecía el
  G-Metodo 2026-07-07); ahora recuerda la conexión fija vía `.claude\settings.local.json`.
  SYNOPSIS sin versión hardcodeada.

## v1.2.0 — 2026-07-07 (G-Metodo del cierre S1 nutri-kids: paga las fricciones K1–K6)

Fuente: `sprints/SPRINT_001-summary.md` de app-nutri-kids (el kit requirió cirugía DENTRO del
sprint aunque el estampado ya era limpio). Aprobado por el usuario 2026-07-07 —
detalle en `entrega/2026-07-07-propuesta-gmetodo-batch-s1-nutri-kids.md`.

- **`vitest.config.ts` + `playwright.config.ts` + `tests/setup.ts` (nuevos, K1):** los configs
  que `ci.yml` siempre asumió, con el patrón validado en nutri-kids (jsdom + coverage v8 piso 70;
  e2e móvil Pixel + desktop; webServer `pnpm build && pnpm start` bajo CI).
- **`lighthouse-urls.json` (nuevo) + ci.yml (K3):** el job Lighthouse audita la lista de URLs del
  archivo (default `["/"]`); cada sprint añade sus rutas. Nota Lantern documentada en el workflow
  (LCP simulado castiga SPAs sanas: 3.8s simulado vs 242ms observado).
- **`next.config.ts` (nuevo, K6):** `devIndicators: false` — el indicador de dev tapa la nav
  inferior móvil e intercepta taps en e2e.
- **CLAUDE.md § Stack:** IA embebida = **adapter multi-proveedor** (proveedor por ADR de cada
  app) — alineado con el principio LLM-agnóstico del pipeline.
- **CLAUDE.md regla 10 + skills:** **Claude Design pasa a BAJO DEMANDA** (2 apps seguidas
  validaron design-system.md del builder + gate visual sobre preview). `repo-app.md`: patrones
  confirmados (useSyncExternalStore para localStorage↔React; overlays de primer uso estáticos;
  devIndicators). `observability.md`: aclaración honesta — **el kit NO trae Sentry cableado**
  (K2/K5); se cablea en el S1 de cada app con el patrón de nutri-kids; se promoverá al kit a la
  3ª validación.
- **estampar-app.ps1 (K4):** el commit inicial lee la versión real del CHANGELOG.

## v1.1.5 — 2026-07-06 (limpieza final del estampado #2)

- **`--skip-install` en create-next-app:** su install interno corría ANTES de que el script
  escribiera `allowBuilds` y abortaba en rojo (`ERR_PNPM_IGNORED_BUILDS` + "Aborting
  installation") — inofensivo pero alarmante. Ahora el único install es el del paso 2, ya
  configurado. El próximo estampado debe correr de punta a punta **sin ningún rojo**.

## v1.1.4 — 2026-07-06 (hotfix #4: el kit se mordía la cola con gitleaks)

- **`security-owasp.md` línea ~116:** el ejemplo didáctico de "nunca hardcodear" traía una clave
  con pinta real (`sk-proj-abc123...`) y el **hook pre-commit de gitleaks del propio kit la
  bloqueó** en el commit inicial del estampado #2 (regla `generic-api-key`, entropía 3.69).
  Ejemplo neutralizado a placeholder sin entropía + comentario del porqué. Validación positiva
  doble: el hook `githooks/pre-commit` (nuevo en v1.1.0) **funciona en commits reales**, y el
  `Check` de v1.1.2 volvió a detener el script en el paso exacto.

## v1.1.3 — 2026-07-06 (hotfix #3: pnpm 11 cambió el mecanismo de builds nativos)

- **`allowBuilds` (pnpm 11) además de `onlyBuiltDependencies` (pnpm 10):** pnpm 11 ya no lee la
  lista `onlyBuiltDependencies`; usa el mapa `allowBuilds: {pkg: true}` y **aborta el install**
  (`ERR_PNPM_IGNORED_BUILDS` fatal) si un build nativo no está aprobado, dejando un stub
  "set this to true or false" en el yaml. El script escribe ahora AMBOS formatos (cada versión
  ignora el ajeno) y añade `@tailwindcss/oxide` (Tailwind 4 compila nativo).
- Validación en vivo del `Check` de v1.1.2: el script se detuvo honesto en
  `FALLO: pnpm install (exit 1)` — el patrón de exit codes funcionó a la primera.

## v1.1.2 — 2026-07-06 (hotfix #2 del estampado de nutri-kids — 3 bugs más)

Detectados al correr el script v1.1.1 en la máquina del usuario (el estampado llegó al final
imprimiendo "OK" con el repo git y el remoto ROTOS):

- **Escrituras sin BOM (`EscribirSinBom`):** `Set-Content -Encoding utf8` en PS 5.1 escribe BOM;
  el BOM rompía `pnpm-workspace.yaml` (pnpm ignoró los builds nativos → `ERR_PNPM_IGNORED_BUILDS`),
  `package.json` ("Invalid package.json" de pnpm) y el JSON de la ruleset. Las 3 escrituras
  ahora usan `[IO.File]::WriteAllText` con `UTF8Encoding($false)`.
- **`git init` explícito e idempotente:** el script asumía que create-next-app inicializa git;
  en la máquina real no lo hizo → 4 `fatal: not a git repository`, sin commit inicial, y el
  `gh repo create --source --push` falló en cadena.
- **`Check` de exit codes tras cada comando nativo crítico** (scaffold, installs, git, gh):
  los comandos nativos no disparan `$ErrorActionPreference=Stop`, así que el script imprimía
  "OK repo creado y push hecho" y "OK ruleset activa" sobre pasos fallidos. Ahora un fallo
  detiene el script con el paso exacto.

## v1.1.1 — 2026-07-06 (hotfix del estampado #2, nutri-kids)

- **estampar-app.ps1 — fix de encoding (bug bloqueante):** el script estaba guardado como
  UTF-8 **sin BOM** y con finales **LF**; Windows PowerShell 5.1 lee los `.ps1` sin BOM como
  ANSI, el "—" (em-dash, multibyte) se degradaba a mojibake que incluye una **comilla
  tipográfica** (0x94), PowerShell la trata como comilla real → el parseo del archivo completo
  reventaba (11 errores) y el estampado nunca arrancaba. Fix mecánico, cero cambios de texto:
  re-guardado **UTF-8 CON BOM + CRLF** (validado: 0 errores de parseo).
- **`.gitattributes` nuevo en la raíz de la planeadora:** `*.ps1 text eol=crlf` (evita que git
  o un editor degrade los scripts de vuelta a LF). Regla derivada para todo el pipeline:
  **scripts `.ps1` con caracteres no-ASCII se guardan siempre UTF-8 con BOM** — o se escriben
  100% ASCII.

## v1.1.0 — 2026-07-05 (G-Metodo: batch post-SPRINT_001 de hoja-de-vida)

Fuente: 9 hallazgos del estampado #1 + la CI real del primer sprint
(`memoria/patrones-acumulados.md` de la planeadora).

- **ci.yml:** pnpm 9 → **11** y Node 20 → **22** en los 3 jobs (el scaffold estampa pnpm 11;
  pnpm 11 exige Node ≥22.13).
- **perf-budget.json:** eliminada la propiedad `_comment` (Lighthouse CI rechaza el archivo);
  `interactive` (TTI, deprecada) → `total-blocking-time ≤300ms`; LCP 2500 → 3000ms (efecto
  font-swap documentado en README §Reglas).
- **githooks/pre-commit** (nuevo): gitleaks bloquea commits manuales con secretos — antes solo
  las escrituras de Claude estaban protegidas (hook PreToolUse).
- **estampar-app.ps1** (nuevo, aprobado G-Metodo 2026-07-04): estampado semi-automático
  completo; criterio de aceptación: app recién estampada pasa CI verde en su primer PR.
  Incorpora: scaffold ANTES del kit, `--src-dir`, builds nativos pre-aprobados
  (`pnpm-workspace.yaml`), scripts `typecheck`/`test`/`test:e2e` con `--passWithNoTests`,
  CLAUDE.md desde `ordenes/CLAUDE-md-para-app.md`, ruleset `main-protegida` por API.
- **Sin `ai`/`@ai-sdk/<proveedor>` en el estampado:** el proveedor LLM se decide por ADR en el
  sprint que active IA.
- **README:** bloque de estampado reescrito alrededor del script; reglas nuevas (Lighthouse
  local orientativo; budget y font-swap).
- **CLAUDE.md:** regla 7 actualizada (doble cinturón gitleaks).

## v1.0.0 — 2026-07-02

Versión inicial (migración Cowork→Code): CLAUDE.md, skills, commands, settings con hooks,
ci.yml, perf-budget.json, MANUAL-DE-USO, gitignore.plantilla.
