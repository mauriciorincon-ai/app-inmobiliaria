# Innmobiliaria

Marketplace inmobiliario del **dueño directo** para Colombia (Bogotá primero). Primera app 100%
comercial del pipeline AI-APPs; cero IA, todo determinista. Publicar el inmueble ES el registro, y
los compradores verificados lo buscan, le escriben al dueño, agendan la visita y deciden con números
(el rango de su zona, la cuota, el papeleo con su norma y la vivienda nueva con lo que de verdad se
paga). Producto completo del hito H-2: 37 funcionalidades, en español y en inglés.

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
pnpm deploy:cf      # guarda de despliegue + build + deploy a Cloudflare Workers (requiere cuenta CF configurada)
pnpm sonda:nube     # tras cada `supabase db push`: comprueba por comportamiento que la migración quedó aplicada (no entra a la CI)
```

## Estructura

```
src/
├─ app/            rutas [lang]/ (landing, publicar, buscar, ficha, visita, vivienda nueva, herramientas y papeleo, antifraude, operador, privacidad) y api/
├─ components/     UI por módulo (publicar/, buscar/, nuevos/, visita/, operador/, motion/, ui/…), sin lógica de negocio
├─ engine/         motores puros con tests (registro/, precio/, simulador/, vivienda-nueva/, papeleo/, antifraude/, ctl/, visita/, agenda/…)
├─ lib/            supabase/, brevo, logger, observability
└─ textos/         diccionario {es, en}: todo texto nuevo nace aquí
supabase/migrations/   schema + RLS + RPC
docs/                  MANUAL-DE-USO.md · GUIA-DE-PRUEBA.html
decisions/             ADRs de implementación
design-system.md       fuente de verdad visual
```

## Documentación

- **Manual de uso:** [`docs/MANUAL-DE-USO.md`](docs/MANUAL-DE-USO.md)
- **Arquitectura as-built:** [`docs/BLUEPRINT.html`](docs/BLUEPRINT.html)
- **Aprovisionamiento (cuentas, secretos, migraciones):** [`docs/APROVISIONAMIENTO.md`](docs/APROVISIONAMIENTO.md)
- **Guía de prueba:** [`docs/GUIA-DE-PRUEBA.html`](docs/GUIA-DE-PRUEBA.html)
- **Sistema de diseño:** [`design-system.md`](design-system.md)
- **Decisiones:** [`decisions/`](decisions/)
