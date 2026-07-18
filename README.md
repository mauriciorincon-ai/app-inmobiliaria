# Innmobiliaria

Marketplace inmobiliario **seller-first** para Colombia (Bogotá primero). Primera app 100%
comercial del pipeline AI-APPs. Fase 1 (cero IA, todo determinista): captar **vendedores directos**
— publicar el inmueble ES el registro a la campaña de expectativa.

> El plan del producto vive en la casa planeadora (`~/Code/hr01-develop-ai-apps`). Este repo es
> solo la implementación. Ver `CLAUDE.md` para las reglas de las dos casas.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 (CSS-first) · GSAP + Lenis · Supabase
(Postgres + RLS + Auth) · Vitest + Playwright + axe · Pino + Sentry. Deploy: Cloudflare Workers
vía OpenNext (ver `decisions/001-hosting-free-tier-comercial.md`).

## Desarrollo

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Para el flujo completo con base de datos (registro + panel) necesitas el stack local de Supabase
(requiere Docker/Colima):

```bash
pnpm exec supabase start          # levanta Postgres + Auth + aplica migraciones
pnpm exec supabase status         # imprime URL y keys → cópialas a .env.local
node scripts/crear-operador.mjs   # siembra el usuario operador (ver variables en .env.example)
```

Variables de entorno: copia `.env.example` a `.env.local` y llena lo que uses.

## Comandos

```bash
pnpm test           # unit (Vitest) + cobertura del motor (>80%)
pnpm test:e2e       # e2e (Playwright): happy path por la UI, validaciones, RLS, axe
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm build          # next build
pnpm deploy:cf      # build + deploy a Cloudflare Workers (requiere cuenta CF configurada)
```

## Estructura

```
src/
├─ app/            rutas (landing, publicar, confirmacion, operador, privacidad, api/registro)
├─ components/     UI (landing/, publicar/, operador/, motion/, ui/)
├─ engine/         motor puro con tests (format/, registro/)
├─ lib/            supabase/, logger, observability
└─ types/
supabase/migrations/   schema + RLS + RPC
docs/                  MANUAL-DE-USO.md · GUIA-DE-PRUEBA.html
decisions/             ADRs de implementación
design-system.md       fuente de verdad visual
```

## Documentación

- **Manual de uso:** [`docs/MANUAL-DE-USO.md`](docs/MANUAL-DE-USO.md)
- **Guía de prueba:** [`docs/GUIA-DE-PRUEBA.html`](docs/GUIA-DE-PRUEBA.html)
- **Sistema de diseño:** [`design-system.md`](design-system.md)
- **Decisiones:** [`decisions/`](decisions/)
