# Aprovisionamiento S1 — Supabase cloud + Cloudflare Workers (runbook)

> Guía paso a paso para pasar de "todo probado en CI" a "app viva en una URL privada" (H1).
> Escrita al cierre del Sprint 001. Convención: **[TÚ]** = solo puede hacerlo el dueño de las
> cuentas (navegador/logins). **[CLAUDE]** = comando no interactivo que puede correr el agente.
> **Regla de oro: la `service_role key` y las contraseñas JAMÁS se pegan en un chat ni se
> commitean** — van solo a `.env.local` (gitignored) o al gestor de secrets del servicio.

## Mapa del despliegue

| Pieza           | Servicio                                         | Qué es                                                                           |
| --------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| Postgres + Auth | **Supabase cloud** (plan free)                   | La base de datos real (vendedores/inmuebles + RLS + RPC) y el login del operador |
| App (Next.js)   | **Cloudflare Workers** (plan free, vía OpenNext) | La landing + wizard + panel + endpoint, servidos en una URL `*.workers.dev`      |
| Keep-alive      | **GitHub Actions** (ya en el repo)               | Cron semanal que evita que el proyecto free de Supabase se pause                 |

El orden importa: primero la base de datos (sin ella la app no tiene dónde escribir), luego se
prueba desde local, luego los secrets del cron, y de último el deploy a Cloudflare.

---

## Bloque 1 — Proyecto Supabase cloud

### 1.1 [TÚ] Crear la cuenta y el proyecto (~3 min)

1. Entra a <https://supabase.com> → **Start your project** → crea la cuenta (puedes usar tu
   cuenta de GitHub `mauriciorincon-ai`, es lo más simple).
2. **New project**, con estos valores:
   - **Name:** `app-inmobiliaria`
   - **Database password:** genera una fuerte y **guárdala en tu gestor de contraseñas** — se
     necesita una sola vez (para vincular el repo) y para emergencias.
   - **Region:** `South America (São Paulo)` — la más cercana a Bogotá.
   - **Plan:** Free.
3. Espera ~2 min a que el proyecto termine de aprovisionarse.

### 1.2 [TÚ] Copiar las credenciales a `.env.local` (~2 min)

En el dashboard del proyecto → **Project Settings** (engranaje) → **API**:

- **Project URL** → es tu `NEXT_PUBLIC_SUPABASE_URL` (forma `https://<ref>.supabase.co`; el
  `<ref>` de esa URL es el **project ref**, se usa en 1.3).
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (esta clave es pública por diseño: viaja
  al navegador; la RLS es la que protege).
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ PODER TOTAL, salta la RLS — solo para
  el script de seed, jamás en la app ni en el chat).

En la raíz del repo: copia `.env.example` a `.env.local` (si no existe) y llena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
OPERADOR_EMAIL=<tu correo de operador>
RATE_LIMIT_PEPPER=<cadena aleatoria larga — genera una con: openssl rand -hex 32>
```

`.env.local` está en `.gitignore`: nunca se commitea (y el hook de gitleaks vigila).

### 1.3 [TÚ] Vincular el repo al proyecto (~1 min, interactivo)

En la terminal integrada, en la raíz del repo:

```bash
pnpm exec supabase login        # abre el navegador para autorizar el CLI
pnpm exec supabase link --project-ref <ref>   # pide la Database password de 1.1
```

### 1.4 [CLAUDE] Aplicar la migración al Postgres cloud

```bash
pnpm exec supabase db push
```

Esto ejecuta `supabase/migrations/20260715000001_captacion_fundadores.sql` contra la base cloud:
crea tablas, enums, RLS, grants y las RPC `registrar_fundador`/`ping`. Verificación: en el
dashboard → **Table Editor** deben aparecer `vendedores`, `inmuebles`, `registro_intentos`.

### 1.5 [TÚ] Apagar los signups y crear el usuario operador (~2 min)

El `config.toml` del repo solo aplica al stack local — en cloud se configura por dashboard:

1. **Authentication → Sign In / Providers → Email**: deja activo Email pero **desactiva
   "Allow new users to sign up"** (solo existirá el operador; nadie más puede crear cuenta).
2. **Authentication → Users → Add user → Create new user**: tu `OPERADOR_EMAIL` + una contraseña
   fuerte, y marca **Auto Confirm User**. (Alternativa por script: `node scripts/crear-operador.mjs`
   con `OPERADOR_PASSWORD` exportado — el dashboard es más simple y no deja la contraseña en
   ningún historial.)

### 1.6 [CLAUDE + TÚ] Prueba de humo contra la nube, desde local

```bash
pnpm dev
```

Con `.env.local` apuntando a la nube: completa un registro de prueba en
`http://localhost:3000/publicar` (datos sintéticos) → debe llegar a la confirmación → entra a
`http://localhost:3000/operador` con tu correo/contraseña → el registro debe estar en la tabla.
Verifica también en el dashboard de Supabase (Table Editor → `inmuebles`).

---

## Bloque 2 — Secrets del keep-alive en GitHub

El workflow `.github/workflows/supabase-ping.yml` (cron lunes 08:17 UTC) evita la pausa del
proyecto free. Necesita 2 secrets del repo (ambos valores son los "públicos" del Bloque 1 — no la
service key):

**[CLAUDE]** (o tú en Settings → Secrets and variables → Actions):

```bash
gh secret set SUPABASE_URL --body "https://<ref>.supabase.co"
gh secret set SUPABASE_ANON_KEY --body "<anon key>"
gh workflow run supabase-ping.yml   # disparo manual para verificar que queda verde
```

---

## Bloque 3 — Deploy a Cloudflare Workers

### 3.1 [TÚ] Crear la cuenta y autorizar wrangler (~3 min)

1. Crea la cuenta en <https://dash.cloudflare.com/sign-up> (plan free; **esta misma cuenta
   servirá para R2/fotos en el S2**).
2. En la terminal integrada:

```bash
pnpm exec wrangler login    # abre el navegador para autorizar
```

### 3.2 [CLAUDE] Habilitar el runtime local de Workers (workerd)

En el S1 se dejó el build nativo de `workerd` ignorado (no hacía falta para CI). Para
`preview`/`deploy` sí hace falta: se cambia `workerd: false → true` en `pnpm-workspace.yaml`
(y se saca de `ignoredBuiltDependencies`) + `pnpm install`.

### 3.3 [CLAUDE] Variables del Worker

Los valores públicos van como `vars` en `wrangler.jsonc` (versionados, no son secretos); los
sensibles como secrets del Worker:

```bash
# vars en wrangler.jsonc (Claude edita el archivo):
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPERADOR_EMAIL
# secret (se lee de .env.local, nunca se muestra):
pnpm exec wrangler secret put RATE_LIMIT_PEPPER
```

> Nota técnica: las `NEXT_PUBLIC_*` también se inyectan en el bundle del navegador en tiempo de
> BUILD desde `.env.local` — por eso el deploy se corre desde una máquina con `.env.local` lleno.

### 3.4 [CLAUDE] Preview local del Worker y deploy

```bash
pnpm preview:cf   # build OpenNext + workerd local: valida que la app corre en runtime Workers
pnpm deploy:cf    # build + deploy real
```

El deploy imprime la URL: `https://app-inmobiliaria.<tu-subdominio>.workers.dev`. Esa es la
**preview privada de H1**: no está indexada (la app manda `robots: noindex`) y no se difunde.

### 3.5 [TÚ] Verificación final en tu teléfono

1. Abre la URL `workers.dev` en el teléfono y recorre `docs/GUIA-DE-PRUEBA.html` (el filtro
   **⭐ gate mínimo**): registro real <3 min, juicio del copy, aprobación visual.
2. Entra al panel (`/operador`) desde el navegador y confirma que ves tu registro de prueba.

---

## Al terminar

- [ ] Registro de prueba visible en el panel de la preview.
- [ ] Cron del ping verde en Actions.
- [ ] Gate ⭐ de la guía completado + visto bueno visual → **merge del PR #1** →
      `/cierre-sprint inmobiliaria` en la planeadora.
- Pendiente para H2a (publicar de verdad): dominio propio, correo real del responsable Ley 1581
  en `/privacidad`, y quitar el `noindex`.

## Problemas conocidos y su solución

| Síntoma                                 | Causa probable                                       | Fix                                 |
| --------------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| `db push` pide contraseña               | el link de 1.3 no guardó la DB password              | repetir `supabase link`             |
| Panel dice "No pudimos cargar" en cloud | migración sin aplicar o usuario sin crear            | 1.4 / 1.5                           |
| `wrangler deploy` falla por `workerd`   | build nativo aún ignorado                            | paso 3.2                            |
| 429 al probar el registro varias veces  | rate limit real (3/hora por IP) — funciona como debe | esperar 1 h o probar desde otra red |
