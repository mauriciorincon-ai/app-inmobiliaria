# ADR 001 — Hosting free-tier con uso comercial permitido

- **Estado:** Aceptado
- **Fecha:** 2026-07-15
- **Sprint:** 001 (primera tarea del builder, por regla de la orden)
- **Decisores:** builder (Claude) + Mauricio (operador). La elección de **plan pago**, si llega a
  hacer falta, es decisión exclusiva del usuario.

## Contexto

Innmobiliaria es la **primera app 100% comercial** del pipeline. El hosting debe cumplir dos cosas
que el resto del pipeline (apps personales) no exigía:

1. **ToS que permita uso comercial en el free tier.** El plan **Hobby de Vercel prohíbe el uso
   comercial** (es «personal, non-commercial use»), documentado como Gap #6 de la investigación
   científica. Usar Vercel Hobby para una app comercial es una violación de sus términos.
2. **Soporte para SSR/route handlers.** La arquitectura de S1 **no** es 100% estática: la landing,
   `/privacidad` y `/confirmacion` se prerenderizan como estáticas, pero `/api/registro` (Route
   Handler con validación server-side + rate limiting) y `/operador` (panel con sesión) necesitan
   runtime de servidor. Esto **descarta `output: export`** (export estático puro).

Restricción técnica adicional: el kit fija **Next.js 16.2.10**. Cualquier adaptador debe soportar
Next 16, que introdujo la arquitectura `proxy.ts` (el antiguo `middleware.ts`) y su «Node
middleware», un punto conocido de fricción con adaptadores de terceros.

## Decisión

**Hosting objetivo (preview de S1 y producción de H2a): Cloudflare Workers vía
`@opennextjs/cloudflare` (OpenNext).**

Razones:

- **Uso comercial permitido en el free tier.** Los docs oficiales de pricing de Cloudflare
  Workers **no imponen ninguna restricción de uso comercial** sobre el plan free (a diferencia de
  Vercel Hobby). Cuota free: **100.000 requests/día** y 10 ms de CPU por invocación — sobrada para
  H1 (privado) y el arranque de H2a.
- **Soporta route handlers server-side** (lo que necesita `/api/registro` y `/operador`), no solo
  assets estáticos.
- **Sinergia con S2:** la misma cuenta Cloudflare aloja **R2** (fotos, decidido con números en la
  investigación: jamás Supabase Storage). Un solo proveedor de infra de borde para toda la fase 1.
- **OpenNext soporta Next.js 16** oficialmente: «All minor and patch versions of Next.js 16 …
  are supported» (docs de OpenNext, 2026-07). El único trap conocido (issue
  `cloudflare/workers-sdk#13755`, «version trap» de la arquitectura Proxy de Next 16) aplica a
  **usar `proxy.ts` con Node middleware + rutas `runtime = "edge"`** — combinación que **esta app
  evita por diseño** (ver Consecuencias).

## Consecuencias

### Restricciones de arquitectura que hacen viable la decisión (obligatorias)

1. **Sin `proxy.ts` / Node middleware.** El guard del panel `/operador` vive en un **Server
   Component layout** (`src/app/operador/layout.tsx`) que valida sesión + allowlist, **no** en
   middleware. Evita de raíz el «Node middleware not supported» de OpenNext.
2. **Route handlers en runtime `nodejs`, nunca `edge`.** `/api/registro` no declara
   `export const runtime = "edge"`. OpenNext/Workers ejecuta Node vía el flag `nodejs_compat`.
3. **Config de Workers:** `nodejs_compat` activado + `compatibility_date` ≥ `2024-09-23` en
   `wrangler.jsonc` (requisito de OpenNext para APIs Node en Workers).

### Operativas

- Dep dev: `@opennextjs/cloudflare` + `wrangler`. Build de deploy: `opennextjs-cloudflare build`.
- La preview de S1 se sirve **no indexada** (`X-Robots-Tag: noindex` + `robots: noindex` en
  metadata) — H1 es privado.
- El aprovisionamiento (cuenta Cloudflare, `wrangler login`, secrets del proyecto) se hace en la
  **Fase 4** (deploy). No bloquea Fases 0–3 (que corren en local + CI).

### Plan B (documentado — si el deploy real falla en Fase 4)

Si `@opennextjs/cloudflare` + Next 16.2 resulta inestable al desplegar (riesgo #1 del sprint):

- **Puente H1 (admitido por la orden):** servir la preview privada de S1 en **Vercel** de forma
  provisional. Matiz de ToS: es una preview **privada, sin público, sin tráfico ni ingresos** —
  desarrollo, no explotación comercial; aceptable como puente temporal, **no** como hosting de
  H2a (publicación al mundo).
- **Alternativa con costo (decisión del usuario):** **Vercel Pro US$20/mes**, que sí licencia uso
  comercial, si se quiere una ruta sin fricción de adaptador. Es un gasto no contemplado en el F0
  #5 (solo dominio ~US$12/año aprobado) → **lo decide Mauricio** explícitamente.

La decisión definitiva de H2a se re-confirma al desplegar de verdad en Fase 4; este ADR fija el
objetivo y las barandas.

## Alternativas consideradas

| Opción                                 | Uso comercial free  | SSR/route handlers | Next 16                         | Veredicto                                          |
| -------------------------------------- | ------------------- | ------------------ | ------------------------------- | -------------------------------------------------- |
| **Cloudflare Workers + OpenNext**      | ✅ permitido        | ✅                 | ✅ (con las barandas de arriba) | **Elegida**                                        |
| Vercel Hobby                           | ❌ prohibido        | ✅                 | ✅ nativo                       | Descartada (ToS)                                   |
| Vercel Pro                             | ✅ (pago US$20/mes) | ✅                 | ✅ nativo                       | Plan B con costo (decide usuario)                  |
| Cloudflare Pages + next-on-pages       | ✅ permitido        | parcial (edge)     | ⚠️ camino legado, edge runtime  | Descartada (OpenNext/Workers es el camino vigente) |
| Static export (`output: export`) + CDN | ✅                  | ❌ (sin server)    | —                               | Descartada (necesitamos `/api/registro` y panel)   |

## Referencias

- OpenNext — Cloudflare adapter, soporte de versiones de Next.js: <https://opennext.js.org/cloudflare>
- «Version trap» Next 16 Proxy ↔ OpenNext: <https://github.com/cloudflare/workers-sdk/issues/13755>
  (cerrado; aplica a `proxy.ts` + edge runtime — evitado por diseño en esta app).
- Cloudflare Workers pricing (free tier, sin restricción comercial): <https://developers.cloudflare.com/workers/platform/pricing/>
- Vercel Hobby = uso personal no comercial: Gap #6 de la investigación científica del sprint.
