# Innmobiliaria — constitución de la app (Claude Code)

> Auto-cargado en cada sesión de este repo. Esta app pertenece al pipeline **AI-APPs**; su plan
> vive en la casa planeadora. **Innmobiliaria** (Innovation + Inmobiliaria, con B — G-Visión
> 2026-07-13) es la primera app **100% comercial** del pipeline: marketplace inmobiliario
> seller-first para Colombia (Bogotá primero). Fase 1: atraer vendedores directos — publicar el
> inmueble ES el registro a la campaña de expectativa.

## Las dos casas (regla dura)

| Casa           | Path                           | Escritor único   | Qué vive ahí                                                             |
| -------------- | ------------------------------ | ---------------- | ------------------------------------------------------------------------ |
| **Planeadora** | `~/Code/hr01-develop-ai-apps/` | su propia sesión | brief, sprints (plan+retro), órdenes de construcción, método, estándares |
| **Esta app**   | este repo                      | **tú**           | código, tests, ADRs de implementación, bitácora y summary del sprint     |

- ✅ Puedes **leer** la planeadora (agregada como `additionalDirectories`, o por path absoluto).
- ❌ **Nunca escribes** en la planeadora. Si el plan necesita cambio, lo anotas en tu
  `sprints/SPRINT_NNN-implementation-log.md` bajo `## Desviación del plan` y avisas al usuario.
- El avance de implementación vive **solo aquí** — la planeadora te lee, tú no le reportas a mano.

## Stack

- **Frontend:** Next.js 16+ (lo que estampe create-next-app) + TypeScript strict + Tailwind +
  shadcn/ui, PWA-first, **+ GSAP/ScrollTrigger + Lenis portados de la página base**
  (`referencias-ui/inmobiliaria/ts01-pagina-real-estate/` de la planeadora — EXCEPCIÓN F0 #5:
  es la BASE declarada del sistema visual, se porta lo visual SIN heredar sus gaps).
- **Backend/BD/Auth:** Supabase (Postgres + RLS + Auth) — **RLS desde la primera tabla: aquí no
  es solo buena práctica, es la garantía arquitectónica Ley 1581** (datos personales de
  terceros: vendedores e inmuebles).
- **IA embebida:** **CERO IA en fase 1 (regla de la app, F0 #5 — "código primero").** Toda
  funcionalidad de la fase 1 es determinista. Si un sprint futuro propone IA: ADR "código
  primero" obligatorio + adapter multi-proveedor conmutable por env (patrón del kit, skill
  `ia-embebida`).
- **Tests:** Vitest (unit/integration) + Playwright (e2e) + Testing Library + @axe-core/playwright.
- **Deploy:** **por ADR de hosting — PRIMERA tarea del S1** (Vercel Hobby prohíbe uso comercial
  y esta app es comercial desde el día 1; candidato: Cloudflare Pages, ToS por verificar).
  Preview por PR, prod desde `main`. **Observabilidad:** Pino + Sentry + PostHog.
  **Sentry viene cableado client-only y metadata-only desde el kit (v1.2.1, validado ×2):**
  `instrumentation-client.ts` (inerte sin `NEXT_PUBLIC_SENTRY_DSN`) + `src/lib/observability.ts`
  (`reportError`: solo tipos + metadatos, jamás mensajes crudos ni contenido del usuario). La DSN
  va en `.env.local`/env vars del hosting (ver `.env.example`).

## Estructura

```
src/
├─ app/            (App Router)
├─ components/     (UI sin lógica de negocio)
├─ engine/         (motores puros, sin side-effects, cobertura >80%)
├─ lib/            (utils, dominio)
│  └─ ia/          (SOLO si un ADR futuro activa IA — fase 1 no la usa)
└─ types/
tests/{unit,integration,e2e}/
design-system.md          (fuente de verdad visual — se crea en el sprint 1 desde la página base)
docs/MANUAL-DE-USO.md     (manual de uso general — OBLIGATORIO, vivo desde el sprint 1)
sprints/SPRINT_NNN-implementation-log.md · SPRINT_NNN-summary.md
decisions/NNN-titulo.md   (ADRs de implementación)
```

## Reglas de desarrollo

1. **TypeScript strict.** Sin `any` ni `@ts-ignore` sin justificación en comentario.
2. **Tests con cada feature.** Motores puros >80%, UI >50%, ≥1 e2e por feature core.
   **Al escribir los PRIMEROS tests (S1): añade `--coverage` al script `test`** — sin el flag los
   umbrales del `vitest.config.ts` no se aplican en CI (el estampado lo omite para que la CI del
   commit inicial quede verde sin tests). Directorios **generados** (`coverage/`, assets copiados
   a `public/`) van a los `globalIgnores` de `eslint.config.mjs`.
3. **Motor separado de UI.** Lógica pura en `engine/`/`lib/`; componentes sin lógica de negocio.
4. **Toda salida de LLM que se persista pasa por esquema Zod** (skill `ia-embebida`) — N/A en
   fase 1 (cero IA), vigente si un ADR futuro la activa.
5. **A11y desde el inicio:** tabindex, aria-labels, contraste AA, `prefers-reduced-motion`.
   En esta app el formulario ES el producto: **labels reales en TODOS los inputs** (WebAIM: 51%
   de la web falla esto).
6. **Commits convencionales**; branch `sprint-NNN/<tema>`; **jamás push directo a `main`** (hook lo
   bloquea); PR con CI verde + preview probado. La ruleset `main-protegida` exige los checks
   `quality`/`e2e`/`lighthouse` **desde el estampado** (regla 2026-07-10 — protección GitHub no
   negociable, repo público); **si un sprint añade un job de CI, se añade a la ruleset en el
   mismo sprint** (`gh api` o Settings → Rules).
7. **Secrets solo en `.env.local` (gitignored) y env vars del hosting.** Doble protección
   gitleaks: hook `pre-commit` de git (`githooks/`, cubre commits manuales) + hook PreToolUse de
   Claude Code (cubre escrituras del agente). El hook nace ejecutable (100755) y `core.hooksPath`
   se re-aplica en cada `pnpm install` (script `prepare` — K12); si un commit con secreto de
   prueba NO es bloqueado, el gate está muerto — repáralo antes de seguir. **Carnada canónica
   verificada (kit v1.6.3): `AWS_ACCESS_KEY_ID=AKIAQ7RTZ4PXKM2WNB3S`** — no improvises el secreto
   de prueba: las reglas modernas de gitleaks exigen alfabeto real (base32 tras `AKIA`) y entropía,
   y una carnada floja pasa en silencio dando falsa tranquilidad (lección 2026-07-15: dos falsos
   "todo bien" seguidos). Si gitleaks sube de versión mayor, re-verificar la carnada en sandbox
   antes de confiar en ella.
8. **Presupuesto de esfuerzo:** ~12 pasos por pantalla; si lo excedes, detente y simplifica o consulta.
9. **Manual de uso vivo (`docs/MANUAL-DE-USO.md`, obligatorio).** Toda feature que llegue a `main`
   queda documentada ahí **en el mismo sprint**: qué hace, cómo se usa (pasos para el usuario
   final), capturas o rutas de pantalla, y limitaciones conocidas. En español llano.
10. **Diseño vanguardista con gate (`design-system.md` + skill `diseno-ui`).** El sprint 1 crea el
    `design-system.md` de la app (tokens desde la página base: acento `#7B5DD6`, tinta `#191A1D`,
    bandas pastel, píldoras, radios amplios); toda pantalla lo obedece. Cada sprint con UI cierra
    con el **checklist de revisión de diseño** del skill `diseno-ui` + aprobación visual del
    usuario sobre la preview. **Claude Design es BAJO DEMANDA durante el ciclo** (G-Metodo
    2026-07-07): el default validado es design-system.md del builder + aprobación sobre la preview.
    **PERO al CERRAR un ciclo (método v1.8.0): el design system consolidado SE PUBLICA en Claude
    Design (`/design-sync`)** como activo de diseño estable — actividad de cierre junto al blueprint.
    (En Innmobiliaria ya se publicó en S1 a pedido del usuario; el cierre de ciclo lo re-consolida.)
11. **Guía de prueba viva y ACUMULATIVA (`docs/GUIA-DE-PRUEBA.html`, OBLIGATORIA en todo sprint
    con UI — reglas duras del pipeline, G-Metodo 2026-07-12 ×2).** HTML visual y **AUTOCONTENIDO**
    (cero CDNs; casillas con `localStorage` bajo **prefijo versionado por sprint**): **qué probar,
    cómo y qué resultado esperar**, por bloques. **Es bola de nieve:** la última versión contiene
    **TODAS las pruebas vigentes**; el sprint N hereda ENTERAS las del N−1 — jamás las comprime
    (comprimir borra la regresión). Cada prueba lleva su **origen visible**: `Nuevo · SN` ·
    `Mejorado en SN` · `SN` a secas (heredada ⇒ regresión), con **filtros por origen**. Una prueba
    solo se elimina cuando su feature dejó de existir, declarado en el historial del pie. Marca el
    **gate mínimo ⭐** (criterio fijo: SOLO lo que ninguna automatización puede verificar —
    recorrido real en un teléfono, juicio sobre contenido, aprobación visual). La guía dice
    cuántas pruebas son y cuánto toman. **Kit de prueba** en `docs/kit-de-prueba/` si un paso
    necesita documento/código/dataset. Implementación de referencia:
    `app-habla/docs/GUIA-DE-PRUEBA.html` (S2).
12. **PROHIBIDO entregar por artifacts de Claude o cualquier plataforma externa** (regla dura del
    pipeline, G-Metodo 2026-07-12). **Todo entregable** es un **ARCHIVO DEL REPO** (HTML
    autocontenido o Markdown) que el usuario pueda abrir, versionar y llevarse. Sin excepciones.
13. **Código primero, IA generativa después (regla dura del pipeline, G-Metodo 2026-07-12).**
    Toda funcionalidad nativa interna se resuelve PRIMERO con programación — código, librerías,
    algoritmos deterministas — antes de cualquier intención de acudir a IA generativa. Activar
    una feature LLM exige un **ADR "código primero"**. En esta app la fase 1 entera es
    determinista por regla de F0.

## Reglas de dominio de Innmobiliaria (F0 #5 + G-Visión + G-Plan 2026-07-13 — van sobre TODO sprint)

1. **Publicar = registro.** La campaña no pide correos, pide inmuebles: el flujo multi-step
   (compromiso mínimo primero — paso 1 con MÁXIMO 3 campos) crea `vendedor` + `inmueble` con
   estados `borrador → publicado_fundador → verificado`. Persistencia por paso (retomar si se cae).
2. **Ley 1581 por construcción:** `consentimiento_at NOT NULL` (sin consentimiento no hay
   envío) · minimización radical · RLS: anónimo solo INSERT vía el flujo, operador SELECT/UPDATE ·
   **PII jamás en fixtures/tests** (datos 100% sintéticos) · política de privacidad enlazada
   desde el consentimiento.
3. **CTL (Certificado de Tradición y Libertad): JAMÁS requisito de entrada.** Es el desbloqueo
   voluntario del nivel 2 ⭐ "Propietario verificado" (llega en S3): documento **VISTO, NUNCA
   almacenado** — persiste solo `matricula` + `verificado` + fecha. La plataforma no paga CTLs.
4. **Cifras citables ÚNICAMENTE** en UI/copy: comisión 3% urbano (≈$12M en vivienda de $400M) ·
   7–7,5 meses de venta promedio · CTL $23.000. **PROHIBIDAS** las de evidencia débil
   ("32% más rápido", "+118% vistas", "3× contactos"). Fuente canónica:
   `portafolio/inmobiliaria/investigacion/2026-07-13-mercado.md` (planeadora, RO).
5. **Escasez y contadores REALES o no existen.** Cero números fabricados, cero cupos falsos,
   cero contadores inventados (la escasez falsa destruye confianza — meta-análisis 2025; fatal
   en un vertical golpeado por fraude).
6. **Sistema visual portado de la página base** (excepción F0 #5): SÍ portar tokens/secciones/
   patrones GSAP-Lenis; NO heredar sus gaps (cero tests/a11y/CI); NO copiar el copy comprador;
   el wordmark es **Innmobiliaria** ("Habita" murió). **LCP nace estático** (patrón
   `wiki/patterns/lcp-nace-estatico.md`): el hero jamás arranca en `opacity: 0`; motion GSAP
   solo bajo el fold. `prefers-reduced-motion` siempre.
7. **Fotos (cuando lleguen, S2):** compresión client-side (`browser-image-compression`, WebP
   full 1600px + thumb 400px) → **Cloudflare R2** vía presigned URL. **JAMÁS Supabase Storage**
   (1GB/5GB egress insuficientes — decidido con números). El gate de calidad fotográfica es
   código determinista.
8. **Mensaje seller-first:** vendedores directos de Bogotá, venta + arriendo con mensaje liderado
   por VENTA. Ni inmobiliarias ni compradores en la UI de fase 1.

## Estándares (los 6+1, gates en CI)

Testing · CI/CD · Observabilidad · Seguridad · Performance (contra `perf-budget.json`) · UX+A11y ·
**IA embebida responsable** (N/A mientras la fase 1 no tenga IA). Detalle canónico:
`estandares/estandares.md` de la planeadora (read-only). Ítem rojo ⇒ deuda técnica explícita en
el summary o el sprint no cierra.

## Workflow de un sprint

**Apertura** — el usuario trae la **orden de construcción** (`portafolio/inmobiliaria/ordenes/SPRINT_NNN-orden.md`
de la planeadora). Léela entera + sus referencias (SPRINT_NNN.md, brief, página base).
**Plan mode primero, siempre.** **La aprobación del plan NO arranca la construcción** (gate de
arranque, kit v1.6.2): tras aprobarse el plan, emite el bloque de arranque — tu recomendación de
**modelo y esfuerzo** para el sprint (el usuario los fija con `/model`) + espacio para sus
ajustes — y espera su **«construye»** explícito antes de tocar cualquier archivo.
Branch `sprint-NNN/<tema>`.

**Durante** — construye por fases (setup → motor → UI → integración → e2e). Mantén viva la bitácora
`sprints/SPRINT_NNN-implementation-log.md` (progreso, decisiones, bugs). ADRs en `decisions/` para
decisiones no anticipadas. `/self-review` tras cada bloque; `/run-tests` frecuente.

**Página base (régimen especial)**: extrae y porta el sistema visual según la regla de dominio 6.
❌ Jamás escribas en la carpeta de la página base (vive en la planeadora; tiene repo propio).

**Cierre — summary OBLIGATORIO.** Con la DoD completa: `/deploy-check` → genera
`sprints/SPRINT_NNN-summary.md` (plantilla abajo) → PR → merge con CI verde. **Al ABRIR el PR:
re-emite el checklist de aprovisionamiento pendiente** de la orden. **Sin summary el sprint NO
está cerrado** (es lo que la planeadora lee para la retrospectiva).

**Cierre de CICLO (método v1.8.0 — cuando este sprint es el ÚLTIMO de un ciclo H1/fase/MVP; la
orden lo declara):** además de la DoD, el sprint entrega (1) **`docs/BLUEPRINT.html`** — as-built
de TODA la infraestructura que soporta la app (plantilla `docs/BLUEPRINT.plantilla.html`: **HTML
autocontenido con diagrama SVG embebido** — jamás mermaid ni CDNs — + tabla por pieza + costo
real + punto único de falla), vivo y acumulativo entre ciclos; y (2) el **design system publicado
en Claude Design** (`/design-sync`). Todo ciclo tiene MÍNIMO 3 sprints (regla dura 2026-07-17).
**S2 NO es cierre de ciclo** (es el 2 de 3): este bloque queda escrito para S3, que lo ejecuta.

### Plantilla del summary

```markdown
---
sprint: NNN
app: inmobiliaria
status: closed
opened: YYYY-MM-DD
closed: YYYY-MM-DD
branch: sprint-NNN/<tema>
pr: <link>
---

# Sprint NNN Summary — Innmobiliaria

## Outcome [¿Se logró el outcome del SPRINT_NNN.md? Sí/No/Parcial + 1 frase]

## Qué se construyó [features/pantallas/componentes]

## DoD — checklist [los 6+1 estándares, uno a uno, con evidencia breve]

## Métricas técnicas [cumplidas vs. no, del SPRINT_NNN.md]

## Decisiones no anticipadas [ADR-NNN: resumen]

## Bugs + resoluciones

## Qué salió bien / qué generó fricción

## Sugerencias de mejora al método [¿algo de metodo/metodo.md debería cambiar?]

## Deuda técnica aceptada [qué, por qué, sprint de pago]

## Archivos clave (máx. 10) · ## Cómo probar
```

## Idioma

Español en conversación, bitácoras Y en la interfaz de la app (**es-CO** — fase 1 monolingüe;
el vendedor bogotano es el usuario). Inglés solo en código, commits, nombres de símbolos y ADRs.
