---
sprint: 001
app: inmobiliaria
tipo: retrospectiva-comparativa
fecha: 2026-07-17
para: la casa planeadora (leer en /cierre-sprint junto al summary)
---

# Retrospectiva S1 — ¿Por qué ESTE sprint logró casi una app lista para mercado?

> Pregunta del usuario al cierre: _"en las otras aplicaciones lográbamos cosas, pero muy
> pequeñas; ¿qué hizo que esta vez tuviéramos casi una aplicación lista para salir al
> mercado?"_ Este documento responde con evidencia de la planeadora (leída en solo-lectura)
> y de este repo. Es una **enseñanza para el método**: la planeadora lo lee al cierre.

## 1. Qué logró este S1 (el dato a explicar)

En un solo sprint: landing completa de 8 secciones · flujo publicar=registro con Postgres real
(RLS estricta + RPC transaccional + rate limiting 3 capas) · panel de operador autenticado ·
política Ley 1581 · 44 unit + 28 e2e verdes en CI (3 jobs) · **aprovisionamiento completo**
(Supabase cloud verificado + secrets + keep-alive) · **deploy real a Cloudflare Workers**
(https://app-inmobiliaria.rinconai.workers.dev, noindex, smoke E2E en producción). Es la
primera app del pipeline que termina su S1 **desplegada, con base de datos productiva y a una
aprobación visual de poder recibir usuarios reales**.

Los S1 anteriores (evidencia: `portafolio/<app>/sprints/SPRINT_001.md` de la planeadora)
fueron victorias deliberadamente pequeñas — **una pantalla o un motor por sprint**:

| App                   | S1 logró                                         | Naturaleza                           |
| --------------------- | ------------------------------------------------ | ------------------------------------ |
| hoja-de-vida (#1)     | HOME bilingüe + formulario Resend                | 1 pantalla estática                  |
| nutri-kids (#2)       | PDF de dieta → estructura + semáforo             | 1 motor + 1 vista                    |
| ds (#3)               | CSV → modelo → veredicto (Pyodide)               | 1 motor en navegador                 |
| habla (#4)            | Respuesta diaria + 1 juego de voz                | 1 estrella + 1 mecánica              |
| **inmobiliaria (#5)** | **Producto de captación end-to-end, desplegado** | **4 pantallas + BD + auth + deploy** |

## 2. Las cinco causas (todas verificables, ninguna es suerte)

### 2.1 El kit llegó maduro: el "impuesto del kit" ya estaba pagado (la causa #1)

Las apps #1–#4 pagaron **12+ fricciones de infraestructura DENTRO de sus sprints**
(`kit-app/CHANGELOG.md` v1.1.0→v1.6.3; `memoria/lecciones-aprendidas.md`): CI rota del kit
inicial (~6 corridas de cirugía en hoja-de-vida S1), cinco hotfixes del estampador en
nutri-kids, configs de test ausentes, Sentry sin cablear, el hook gitleaks **muerto en
silencio durante 3 sprints** (ds S3), la ruleset sin checks día 0… Cada una se pagó una vez y
se devolvió al kit.

Resultado: **Innmobiliaria estampó con K=0** — "Primer estampado con CERO fricciones de kit"
(`lecciones-aprendidas.md`, 2026-07-15). Este sprint gastó su presupuesto de fricción en el
PRODUCTO (K1–K6 son todas fricciones de la capa de datos nueva, ninguna del kit). **Las cosas
"pequeñas" de las otras apps y lo "grande" de esta son la misma curva**: aquéllas construían
el sustrato mientras entregaban; ésta cosechó el sustrato.

### 2.2 El método ya tenía todas sus reglas duras

Para el 2026-07-13 (apertura de este S1) el método 7F ya incluía lo que las apps previas
fueron **pariendo a golpes**: ruta MVP H1/H2 (v1.4.0), protección GitHub día 0, guía de
prueba viva → **acumulativa** (v1.5.0→v1.6.0), **"código primero, IA después"** (v1.6.0),
prohibición de artifacts (v1.5.0) y el **gate de arranque** (v1.6.2) — que nació
**precisamente preparando este sprint** y aquí se estrenó: plan aprobado ≠ construir, el
usuario fijó modelo y esfuerzo (contexto 1M, esfuerzo alto sostenido) antes del «construye».
Un sprint ambicioso con el modelo/esfuerzo equivocados se habría fragmentado.

### 2.3 Seis patrones wiki destilados: cero re-descubrimiento

`lcp-nace-estatico` (el hero GSAP nació estático al primer intento — hoja-de-vida lo pagó ×3),
`reduced-motion-fail-safe`, `la-ci-verifica-comportamiento-no-experiencia` (e2e POR LA UI
desde el plan — habla lo pagó con 4 defectos), `zod-vive-en-el-servidor`, etc. Este S1
**aplicó** patrones en vez de descubrirlos; sus propios hallazgos (K3–K6) ya quedaron
documentados para la siguiente app.

### 2.4 Página base declarada: el sistema visual se PORTÓ, no se diseñó

Única app del pipeline cuyo S1 partió de una landing real ya construida
(`referencias-ui/inmobiliaria/ts01-pagina-real-estate`, excepción F0 #5 a la convención
READ-ONLY, declarada 2026-07-13). Tokens, secciones, GSAP/Lenis: portados y endurecidos
(AA, reduced-motion, LCP estático) en vez de creados. El diseño vanguardista — normalmente
un sprint entero — costó una fracción, **sin heredar los gaps de la base** (cero
tests/a11y/CI de origen).

### 2.5 Una F1 inusualmente rica + una orden precisa

~120 fuentes de investigación de mercado, cifras citables ya separadas de las prohibidas,
decisión CTL tomada ANTES de construir, reglas de dominio explícitas (publicar=registro,
Ley 1581 por construcción, escasez real o nada). El builder no gastó el sprint decidiendo
QUÉ construir ni negociando alcance: la orden traía las tensiones ya resueltas.

## 3. El contrapeso honesto (para no sobre-aprender)

- **No todo fue más rápido.** Este S1 tomó ~4 días de calendario (habla cerró 2 sprints en
  2 días). El alcance grande FUE más caro; lo nuevo es que fue **posible y de calidad**.
- **La capa de datos cobró su propio impuesto de primera vez** (K1–K6: sin Docker local,
  comillas de `supabase status`, stdout de Playwright, grants de `authenticated` y de
  `service_role`). 7 iteraciones de CI hasta verde. Igual que el kit en su día: ya están
  documentadas y las siguientes apps con BD no las pagarán.
- **El gate humano sigue pendiente** (⭐ en teléfono + aprobación visual): "casi lista para
  mercado" ≠ lista. La CI verifica comportamiento, no experiencia — ese patrón sigue vigente.

## 4. Enseñanzas propuestas para el método (leer en /cierre-sprint)

1. **El impuesto del kit se paga una vez si — y solo si — se devuelve al kit en el mismo
   sprint.** Confirmado end-to-end (12+ fricciones → K=0). Extenderlo formalmente a la capa
   de datos: promover K3/K4/K5/K6 a un patrón wiki tipo `supabase-en-ci-y-cloud` y/o al kit
   (bloque e2e de `ci.yml` + migración plantilla con GRANTs explícitos).
2. **El alcance de un S1 puede escalar CUANDO el sustrato está maduro.** Condiciones
   verificadas aquí: estampado K=0 + patrones aplicables + base visual portable + orden con
   tensiones resueltas + modelo/esfuerzo fijados en el gate de arranque. Sin esas
   condiciones, la victoria pequeña sigue siendo el tamaño correcto (no planear S1 grandes
   "porque inmobiliaria pudo").
3. **"Base declarada" merece ser figura formal del método**, no excepción ad-hoc: cuando
   exista una referencia visual propia y portable, declararla en F0 con sus límites (portar
   lo visual, no heredar gaps) multiplicó el rendimiento del sprint de UI.
4. **El aprovisionamiento como runbook [TÚ]/[CLAUDE] funcionó** (`docs/APROVISIONAMIENTO.md`):
   división explícita entre lo que solo puede hacer el dueño de las cuentas y lo que corre el
   agente, con verificación en vivo por bloque. Candidato a plantilla del kit. Incluye
   recomendación de identidad por servicio (SSO vs. credencial de primera mano para la casa
   de la infraestructura).
5. **Provisionar la nube temprano cuando no hay Docker local** (ya sugerido en el summary):
   el primer contacto real con Postgres no debería ocurrir en la CI del cierre.
6. **El gate de arranque queda validado en su estreno**: fijar modelo/esfuerzo por sprint es
   palanca real de rendimiento, no burocracia.

## 5. Referencias

- Este repo: `sprints/SPRINT_001-summary.md` · `sprints/SPRINT_001-implementation-log.md`
  (K1–K6, aprovisionamiento) · `docs/APROVISIONAMIENTO.md` · `design-system.md`.
- Planeadora (RO): `kit-app/CHANGELOG.md` · `memoria/lecciones-aprendidas.md` ·
  `metodo/metodo.md` (changelog v1.1.0–v1.6.0) · `wiki/patterns/*` ·
  `portafolio/{hoja-de-vida,nutri-kids,ds,habla}/sprints/SPRINT_00*.md` ·
  `entrega/2026-07-13-propuesta-gmetodo-gate-de-arranque.md`.
