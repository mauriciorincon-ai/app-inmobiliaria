# Aprovisionamiento S1 — Supabase cloud + Cloudflare Workers (runbook)

> Guía paso a paso para pasar de "todo probado en CI" a "app viva en una URL privada" (H1).
> Escrita al cierre del Sprint 001. Convención: **[TÚ]** = solo puede hacerlo el dueño de las
> cuentas (navegador/logins). **[CLAUDE]** = comando no interactivo que puede correr el agente.
> **Regla de oro: la `service_role key` y las contraseñas JAMÁS se pegan en un chat ni se
> commitean** — van solo a `.env.local` (gitignored) o al gestor de secrets del servicio.

## Mapa del despliegue

| Pieza           | Servicio                                         | Qué es                                                                                |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Postgres + Auth | **Supabase cloud** (plan free)                   | La base de datos real (vendedores/inmuebles + RLS + RPC) y el login del operador      |
| App (Next.js)   | **Cloudflare Workers** (plan free, vía OpenNext) | La landing + wizard + panel + endpoint, servidos en el subdominio de tu cuenta        |
| Keep-alive      | **GitHub Actions** (ya en el repo)               | Cron diario (con alerta si falla) que evita que el proyecto free de Supabase se pause |

El orden importa: primero la base de datos (sin ella la app no tiene dónde escribir), luego se
prueba desde local, luego los secrets del cron, y de último el deploy a Cloudflare.

## Con qué cuenta entrar a cada servicio (recomendación)

El operador tiene dos identidades que terminan en el mismo lugar: el Gmail personal y la cuenta
de GitHub dueña del repo (que a su vez se autentica con ese Gmail). Recomendación por
servicio:

| Servicio               | Entra con                                              | Por qué                                                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase**           | **"Continue with GitHub"** (la cuenta dueña del repo)  | Es lo más conveniente: cero contraseñas nuevas, el proyecto queda atado a la misma identidad dueña del repo, y las integraciones GitHub↔Supabase futuras (previews por rama, etc.) piden justamente ese vínculo                                                                           |
| **Cloudflare**         | **El Gmail directo (email + contraseña propia + 2FA)** | Cloudflare será la casa de la infraestructura (Workers, R2 y, desde el S9, el dominio y su DNS). Para la cuenta que sostendrá el dominio conviene una credencial de primera mano, no una cadena de SSO: si un día GitHub/Google fallan o se bloquean, el acceso a tu DNS no cae con ellos |
| **GitHub** (ya existe) | —                                                      | Sigue como está                                                                                                                                                                                                                                                                           |

**Regla raíz:** como TODO (GitHub → Supabase, y la recuperación de Cloudflare) desemboca en el
Gmail, ese correo es el punto único de falla — **activa 2FA en el Gmail** si no lo tiene, y
2FA en Cloudflare al crearla.

---

## Bloque 1 — Proyecto Supabase cloud

### 1.1 [TÚ] Crear la cuenta y el proyecto (~3 min)

1. Entra a <https://supabase.com> → **Start your project** → crea la cuenta con
   **"Continue with GitHub"** (la cuenta dueña del repo) — ver la tabla de cuentas al inicio.
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

Esto aplica a la base cloud TODAS las migraciones de `supabase/migrations/` que aún no estén (hoy son 19, hasta la del S16; la primera es `20260715000001_captacion_fundadores.sql`). Antes, `supabase db push --dry-run` lista lo pendiente, y después `supabase migration list --linked` debe salir sin diferencias. La primera migración crea:
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

### 1.7 [CLAUDE] El humo anónimo (desde el S12: se corre antes y después de cada migración que cambia lo público)

«Humo anónimo» = lo que ve alguien con la llave PÚBLICA de la base y nada más, comprobado con una corrida de **solo lectura**
(ninguna llamada cambia datos: las que deben rechazarse se rechazan antes de ejecutarse):

```bash
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/humo-anonimo.mjs --espera ausente|vacia|publicada [--salas ausente|presente] [--antifraude ausente|presente] [--lote ausente|presente]
```

`--espera ausente` antes de aplicar la migración 15 (la RPC pública aún no existe), `vacia` después de aplicarla y antes de
publicar (la RPC responde `null`), `publicada` con una edición publicada (cada proyecto trae exactamente las 25 claves de la
lista blanca). Siempre comprueba que `ping()` responde; con `vacia` y `publicada` comprueba además que el anónimo no lee las tablas y que
no puede cargar, publicar ni retirar una edición (con `ausente` esas funciones aún no existen). Sale con código 1 si algo no es lo esperado y jamás imprime la URL ni la llave.

Desde el S13, `--salas ausente` (antes de la migración 16) comprueba que las funciones de las salas aún no existen y `--salas presente`
(después) que el anónimo no lee `salas_ventas`, que las funciones del operador y la del servidor le responden 401, que pedir una visita
a una sala con una sesión falsa se rechaza y que `usados_para_comparar` devuelve solo área y precio.

Desde el S15, `--antifraude ausente|presente` (migración 17) comprueba que el anónimo no lee reportes, banderas ni sesiones y que las
funciones del operador le están cerradas; desde el S16, `--lote ausente|presente` (migración 19) comprueba lo suyo: la visita con consentimiento,
las funciones nuevas cerradas al anónimo. Los dos valen `presente` por omisión salvo con `--espera ausente`.

### 1.8 [CLAUDE] La sonda de las migraciones (desde el S16: se corre tras cada `supabase db push`)

`supabase migration list --linked` dice que una migración **está registrada**; la sonda comprueba por **comportamiento** que su
cuerpo **quedó aplicado** (en el S15 solo se pudo verificar la lista de versiones: `supabase db query --linked` respondía 401 y no había forma de leer el cuerpo de una función en la nube). Conecta con la URL del pooler que deja el
CLI (`supabase/.temp/`, ignorada por git) y `SUPABASE_DB_PASSWORD` (la lee de `.env.local`, sola; si la exportas, gana la exportada), corre cada caso dentro de `BEGIN … ROLLBACK` (no cambia ningún
dato) y **no entra a la CI** (no hay base real en ella):

```bash
pnpm sonda:nube
```

La conexión va cifrada, pero **sin verificar el certificado del servidor** salvo que pongas `SUPABASE_DB_CA` (la ruta al certificado raíz de
Supabase, bajado del panel y guardado fuera de git): sin ella, alguien que se interpusiera entre tu máquina y el pooler vería la contraseña de la
base. Es un riesgo aceptado para una sonda que corres a mano; con la CA puesta, desaparece.

Una función que debe rechazar lo inválido lo rechaza; una columna nueva existe; una función retirada ya no está. Una migración sin
sonda no se da por verificada: el cierre del sprint dice cuántas pasan.

---

## Bloque 2 — Secrets del keep-alive en GitHub

El workflow `.github/workflows/supabase-ping.yml` (cron DIARIO 08:17 UTC; si falla abre un issue con la
etiqueta `alerta`) evita la pausa del proyecto free. Necesita 2 secrets del repo (ambos valores son los
"públicos" del Bloque 1 — no la service key). El barrido de vigencia (`vigencia.yml`, lunes 09:23 UTC)
necesita además `SUPABASE_SERVICE_ROLE_KEY`: sin él FALLA a propósito (antes salía en verde sin hacer nada):

**[CLAUDE]** (o tú en Settings → Secrets and variables → Actions):

```bash
gh secret set SUPABASE_URL --body "https://<ref>.supabase.co"
gh secret set SUPABASE_ANON_KEY --body "<anon key>"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "<service_role key>"   # solo para vigencia.yml
gh workflow run supabase-ping.yml   # disparo manual para verificar que queda verde
```

---

## Bloque 3 — Deploy a Cloudflare Workers

### 3.1 [TÚ] Crear la cuenta y autorizar wrangler (~3 min)

1. Crea la cuenta en <https://dash.cloudflare.com/sign-up> con **el Gmail directo (email +
   contraseña propia) y activa 2FA de una vez** — no uses SSO aquí: esta cuenta sostendrá la
   infraestructura (Workers, **R2/fotos y, desde el S9, el dominio y su DNS**) y conviene que no
   dependa de otra sesión para entrar (ver la tabla de cuentas al inicio). Plan free.
2. En la terminal integrada:

```bash
pnpm exec wrangler login    # abre el navegador para autorizar
```

### 3.2 [CLAUDE] Habilitar el runtime local de Workers (workerd)

En el S1 se dejó el build nativo de `workerd` ignorado (no hacía falta para CI). Para
`preview`/`deploy` sí hace falta: se cambia `workerd: false → true` en `pnpm-workspace.yaml`
(y se saca de `ignoredBuiltDependencies`) + `pnpm install`.

### 3.3 [CLAUDE] Variables del Worker

Los valores GENUINAMENTE públicos van como `vars` en `wrangler.jsonc` (versionados, no son
secretos); el resto como secrets del Worker. **Ojo: `OPERADOR_EMAIL` NO se versiona** — el repo
es público y es un correo personal (anti-harvesting); va como secret aunque no sea "secreto":

```bash
# vars en wrangler.jsonc (Claude edita el archivo):
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# secrets (se leen de .env.local, nunca se muestran):
pnpm exec wrangler secret put RATE_LIMIT_PEPPER
pnpm exec wrangler secret put OPERADOR_EMAIL
```

> Nota técnica: las `NEXT_PUBLIC_*` también se inyectan en el bundle del navegador en tiempo de
> BUILD desde `.env.local` — por eso el deploy se corre desde una máquina con `.env.local` lleno.

### 3.4 [CLAUDE] Preview local del Worker y deploy

```bash
pnpm preview:cf   # build OpenNext + workerd local: valida que la app corre en runtime Workers
pnpm deploy:cf    # guarda de despliegue + build + deploy real
```

Antes de construir, `scripts/guarda-despliegue.mjs` se niega a seguir (y dice cuál y dónde, sin imprimir valores) si hay una
perilla de prueba encendida en el entorno, en un `.env*` de producción o en las `vars` de `wrangler.jsonc`: cualquier
`*_SIMULACRO`, cualquier `*_MOCK`, `DISABLE_RATE_LIMIT` o `REGISTRO_MIN_MS` (S13). Esas perillas son solo de la CI y de las pruebas.

El deploy **imprime la URL de la app** al terminar (subdominio de Cloudflare Workers de tu cuenta).
Esa es la **preview privada de H1**: no está indexada (la app manda `robots: noindex`) y no se
difunde. **La URL no se escribe en el repo** (regla 17 — cero enlaces): vive en tu gestor de
contraseñas y en las env vars del hosting.

### 3.5 [TÚ] Verificación final en tu teléfono

1. Abre esa URL en el teléfono y recorre `docs/GUIA-DE-PRUEBA.html` (el filtro
   **⭐ gate mínimo**): registro real <3 min, juicio del copy, aprobación visual.
2. Entra al panel (`/operador`) desde el navegador y confirma que ves tu registro de prueba.

---

## Bloque 4 — Cloudflare R2 para fotos (Sprint 002)

Las fotos viven en **Cloudflare R2** (jamás Supabase Storage), en la MISMA cuenta del Worker.
Free tier: 10 GB + egress US$0. **[TÚ]** en el dashboard de Cloudflare:

### 4.1 [TÚ] Activar R2 + crear el bucket (~3 min)

1. Dashboard de Cloudflare → **R2** → **Enable R2**. (Puede pedir un método de pago de respaldo
   para verificar la cuenta; **no hay cobro esperado** en el free tier — verifícalo.)
2. **Create bucket**: nombre exacto `innmobiliaria-fotos`, location automática.
3. Bucket → **Settings** → **Public access** → habilita el dominio **r2.dev** → copia la URL
   `https://pub-<hash>.r2.dev` (es tu `NEXT_PUBLIC_R2_PUBLIC_URL`).

### 4.2 [TÚ] Crear el API token S3 (~2 min)

R2 → **Manage R2 API Tokens** → **Create API token** → permiso **Object Read & Write**, scoped al
bucket `innmobiliaria-fotos`. Copia el **Access Key ID** y el **Secret Access Key** (el secret se
muestra UNA vez). El **Account ID** está en la barra lateral de R2. Estos tres van SOLO a
`.env.local` y a `wrangler secret` — **jamás al chat ni al commit**.

En `.env.local`:

```bash
# (pega los valores reales del dashboard; estos son solo marcadores)
R2_ACCOUNT_ID=tu-account-id
R2_ACCESS_KEY_ID=tu-access-key-id
R2_SECRET_ACCESS_KEY=tu-secret-access-key
R2_BUCKET=innmobiliaria-fotos
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-tuhash.r2.dev
# La URL que imprimió `pnpm deploy:cf` (NO se versiona en el repo — regla 17):
NEXT_PUBLIC_APP_URL=https://<tu-app>.<tu-subdominio-cloudflare>
# Correo de contacto del responsable (Ley 1581) que publica /privacidad. Variable de BUILD, nunca se
# versiona: sin ella `pnpm deploy:cf` falla a propósito (next.config.ts) en vez de publicar sin contacto.
NEXT_PUBLIC_RESPONSABLE_CORREO=correo-del-responsable
```

### 4.3 [CLAUDE] CORS del bucket + vars/secrets del Worker + deploy

```bash
# CORS: permitir PUT directo desde el navegador (localhost + la URL de prod).
# OJO wrangler 4.x: es `cors set <bucket> --file <json>` (el `cors put --rules` quedó OBSOLETO) y
# el JSON debe tener forma {"rules":[{"allowed":{"origins":[...],"methods":["PUT"],"headers":["content-type"]}}]}.
# Sustituye $APP_URL por la URL real que imprimió el deploy (no se versiona — regla 17).
APP_URL="$NEXT_PUBLIC_APP_URL"   # tómala de tu .env.local
cat > /tmp/r2-cors.json <<JSON
{"rules":[{"allowed":{"origins":["http://localhost:3000","$APP_URL"],"methods":["PUT"],"headers":["content-type"]}}]}
JSON
pnpm exec wrangler r2 bucket cors set innmobiliaria-fotos --file /tmp/r2-cors.json
pnpm exec wrangler r2 bucket cors list innmobiliaria-fotos   # verificar
# vars públicas en wrangler.jsonc (Claude las edita): NEXT_PUBLIC_R2_PUBLIC_URL, NEXT_PUBLIC_APP_URL, R2_BUCKET
# secrets del Worker (se leen de .env.local por stdin, nunca se muestran; R2_ACCOUNT_ID va como
# SECRET, no en wrangler.jsonc — repo público). En zsh NO uses ${!VAR} (bad substitution):
set -a; . ./.env.local; set +a
printf '%s' "$R2_ACCOUNT_ID"        | pnpm exec wrangler secret put R2_ACCOUNT_ID
printf '%s' "$R2_ACCESS_KEY_ID"     | pnpm exec wrangler secret put R2_ACCESS_KEY_ID
printf '%s' "$R2_SECRET_ACCESS_KEY" | pnpm exec wrangler secret put R2_SECRET_ACCESS_KEY
# migración 2 a la nube + deploy:
pnpm exec supabase db push --yes    # (--dry-run primero para previsualizar)
pnpm deploy:cf
```

> **Nota (inmobiliaria S2, deploy real):** la subida de secrets puede devolver un `10013 "unknown
error"` transitorio de la API de Cloudflare — reintenta el mismo `secret put` y pasa. Verifica
> con `wrangler secret list`. La prueba de humo (4.4) confirma firma+PUT+GET público en vivo.

### 4.4 [TÚ] Prueba de humo de fotos

Con el deploy listo, abre tu enlace **"mi anuncio"** en el teléfono → sube una foto real → debe
aparecer en la galería y en la ficha `/i/…`; pega la ficha en WhatsApp y verifica la vista previa.

## Bloque 5 — WhatsApp: verificar al comprador (Sprint 007)

Innmobiliaria **solo recibe** mensajes de WhatsApp: el comprador nos manda un código y así prueba que su
número es suyo. Recibir no se cobra y nada se envía desde la plataforma (ADR 015). Costo: **US$0**.

| Qué                                                                           | Cuándo                                                                                                | Qué haces tú                                                                                                                                                                |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cuenta de Meta Business + app en Meta for Developers con el producto WhatsApp | antes del deploy real                                                                                 | creas la app; de ella salen el **App Secret** y tú eliges un **token de verificación** (cualquier texto largo)                                                              |
| Número                                                                        | construcción: el de prueba que da Meta · ensayo general: uno propio que no esté en la app de WhatsApp | lo registras en la app de Meta; ese es el número al que el comprador escribe                                                                                                |
| Webhook                                                                       | tras el deploy                                                                                        | en la app de Meta, WhatsApp → Configuración: pegas la dirección de tu sitio terminada en `/api/whatsapp/webhook` y el token de verificación; suscribes el evento `messages` |

### 5.1 [TÚ] Poner los cuatro secretos en el Worker

Los valores reales entran a `wrangler secret`, **jamás al chat, al repo ni a `wrangler.jsonc`**:

```bash
pnpm exec wrangler secret put WHATSAPP_APP_SECRET      # el «App Secret» de la app de Meta
pnpm exec wrangler secret put WHATSAPP_VERIFY_TOKEN    # el texto que elegiste para la suscripción
pnpm exec wrangler secret put WHATSAPP_NUMERO          # el número de Innmobiliaria, con +57 y sin espacios
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY  # la «service_role» del proyecto (solo la usa el webhook)
```

Cada comando pide el valor por la terminal. Sin ellos la verificación responde «no disponible» y el
webhook rechaza todo; nada más de la app se afecta. Después, `pnpm deploy:cf`.

**Estado (2026-10-26, leído con `wrangler secret list`, solo nombres):** `SUPABASE_SERVICE_ROLE_KEY` **está puesta**;
`WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` y `WHATSAPP_NUMERO` **faltan**. Sin ellas, en producción «verificar tu WhatsApp»
responde «no disponible» y el comprador no puede contactar ni agendar: **el ensayo general de esas paradas no se puede hacer
hasta ponerlas** (y hace falta un segundo teléfono para hacer de comprador). Un valor nunca se escribe en este archivo.

### 5.2 [TÚ] Suscribir el webhook en Meta y probar

1. En Meta, pega la dirección del webhook y el token de verificación: Meta debe aceptarla («verificado y
   guardado»). Si la rechaza, el token o el despliegue no coinciden.
2. Suscribe el evento `messages`.
3. Desde tu teléfono, abre una ficha con contacto activo y verifica tu WhatsApp (bloque K de la guía).

## Bloque 6 — La visita: identidad y recordatorios (Sprint 008)

Dos servicios nuevos, los dos **opcionales hasta el ensayo general**: el proveedor que valida la cédula y el
Cron Trigger que manda los recordatorios (ADR 016). Costo: **US$0** (tope de la app: 40 consultas al mes,
5 al día, 3 intentos por comprador; Brevo y Cloudflare, dentro de lo gratis).

| Qué                                                             | Cuándo                                                                                                                                     | Qué haces tú                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Cuenta de Didit (validación de cédula contra la Registraduría)  | **ensayo general** (hasta entonces, en producción «Identificarse» dice «no disponible»; el simulador es solo de desarrollo)                | creas la cuenta **sin tarjeta y sin recarga automática**, copias la API key      |
| `CRON_SECRET`                                                   | antes del deploy                                                                                                                           | inventas un texto largo (≥ 16 caracteres) y lo guardas como secreto del Worker   |
| Brevo                                                           | **hecho el 2026-10-19 (S9)**: cuenta, dominio autenticado, remitente verificado y llave; los secretos están en el Worker (ver 6.1 y 6.4)   | el mismo remitente verificado sirve para los avisos de la visita y las alertas   |
| Migraciones 10, 11 y 12                                         | ya aplicadas en la nube con tu «sí»                                                                                                        | nada                                                                             |
| Migración 19 (S16, el lote del hito: consentimiento y tope de la visita, bandera que vuelve solo si cambia el dato, cerrar un CTL no entregado, sala sin corte, aviso de baja desde 1 %, cupo de correos) | **SOLO local hasta tu «sí»** (`db push --dry-run` la lista como la única pendiente; después `migration list --linked`, el humo `--lote` y `pnpm sonda:nube`). **Orden:** aplicarla y desplegar la app en seguida: la firma vieja de la visita se retira, y entre un paso y otro la solicitud de visita falla | tu «sí» |
| Migraciones 17 y 18 (S15, antifraude y sesiones; el orden de la cola)  | **ya aplicadas en la nube el 2026-10-25** con tu «sí» (18/18; humo anónimo `--antifraude`: 44 de 44) | nada |
| Migración 16 (S13, visita a salas de ventas y muestra validada) | **ya aplicada en la nube el 2026-10-22** con tu «sí» (16/16; humo anónimo con `--salas presente`: 18 de 18; la 187 intacta, 0 solicitudes) | nada; el operador escribe el contacto de cada sala en el panel, jamás en el repo |
| Migración 15 (S12, la edición de vivienda nueva en la base)     | **ya aplicada en la nube el 2026-10-21** con tu «sí» (15/15; humo anónimo antes, después y con la edición 187 publicada: 9 de 9)           | nada; cada mes, revisar la muestra de 5 antes de publicar (`/bandeja`)           |
| Migración 14 (S10, tasa de vivienda y comparables de precio)    | **ya aplicada en la nube el 2026-10-19** con tu «sí» (14/14, `migration list --linked`)                                                    | nada                                                                             |
| Migración 13 (S9, rechazo de una alerta que nadie pidió)        | **ya aplicada en la nube** con tu «sí» (13/13)                                                                                             | nada                                                                             |

**La tasa de vivienda (S10) no pide nada tuyo:** el cron diario la lee de un conjunto abierto de la Superintendencia
Financiera y la guarda con su fecha; no hay llave ni cuenta. `TASA_SIMULACRO` es solo de la CI y las pruebas: **en
producción NO se define** (con ella el cron no sale a la red y guardaría una tasa fija de prueba).

**La vivienda nueva (S12) tampoco pide nada tuyo en el Worker.** Lee la edición publicada con la llave pública. `NUEVOS_SIMULACRO`
es solo de la CI y las pruebas (hace que el servidor respete la cabecera `x-hoy-simulado`): **en producción NO se define**, y
desde el S13 `pnpm deploy:cf` lo comprueba por ti.

### 6.1 [TÚ] Poner los secretos en el Worker

```bash
pnpm exec wrangler secret put CRON_SECRET               # un texto largo que inventas; lo usa el cron y su respaldo
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY # la llave de servicio del proyecto (sale del panel de Supabase)
pnpm exec wrangler secret put BREVO_API_KEY             # la llave del correo
pnpm exec wrangler secret put BREVO_FROM_EMAIL          # el remitente verificado en Brevo
pnpm exec wrangler secret put DIDIT_API_KEY             # solo en el ensayo general: la API key de Didit
pnpm exec wrangler secret list                          # comprueba que los nombres quedaron (no muestra valores)
```

**Estado (2026-10-19): los cuatro están puestos** (se subieron con `wrangler secret bulk` desde un archivo temporal;
`wrangler secret list` muestra los nombres). Antes no estaban, aunque el S8 afirmaba lo contrario. Sin ellos, en producción ni los recordatorios de visita ni los
resúmenes de alertas salen. Sin `DIDIT_API_KEY` (y sin el simulador) «Identificarse» responde «no
disponible»: **nunca simula en silencio**. Sin `CRON_SECRET` el trabajo diario responde 503 y no manda
nada. Sin la llave de servicio, crear una alerta responde «no disponible» y el cron no reclama resúmenes.
**Estado (2026-10-26): `DIDIT_API_KEY` falta**; los otros tres siguen puestos. Los pone **la persona dueña de la cuenta**, a mano: la herramienta de construcción no escribe secretos en
la nube. Después, `pnpm deploy:cf`: el Worker queda con el Cron Trigger `0 13 * * *` (las 8:00 de
Bogotá).

### 6.2 [TÚ] Comprobar el cron en producción (recordatorios del S8 y resúmenes de alertas del S9)

1. En el panel de Cloudflare → Workers → tu Worker → **Triggers**, debe aparecer el Cron `0 13 * * *`.
2. El primer día con una visita confirmada para el día siguiente, mira **Logs**: una línea
   `evento: "cron"` con los conteos (sin datos de nadie).
3. Si el plan gratis no alcanza (10 ms de CPU) o el cron falla, activa el respaldo: en GitHub, el workflow
   «Recordatorios de visitas (respaldo)» (descomenta su `schedule`) con los secretos del repo `APP_URL` y
   `CRON_SECRET`. Correr los dos el mismo día no duplica nada.

> **S9 (guardar y avisar):** no añade ningún servicio. El resumen diario de las alertas y su correo de
> confirmación usan **los mismos cuatro secretos** de arriba y el mismo cron de las 8:00; el tope de correos
> de alertas es de 250 al día, y los correos de visita pasan siempre primero. Las migraciones 12 y 13 se
> aplican con `supabase db push` y se comprueban con `supabase migration list --linked`.

### 6.4 [TÚ] Dominio propio y correo real (hecho el 2026-10-19; para repetirlo en otra cuenta o entorno)

Orden que funcionó. Lo que sigue usa `<tu-dominio>` como marcador: el dominio real **no** se escribe en el
repo (regla 9); vive en el panel de Cloudflare, en Brevo y en `.env.local`.

1. **Dominio al Worker.** Cloudflare → Workers y Pages → tu Worker → pestaña **Domains** → **Add Domain**:
   la raíz y `www`, con _Production_. Cloudflare crea el DNS y el certificado en 1–5 minutos. No va en
   `wrangler.jsonc` (la regla de cero enlaces lo prohíbe). Compruébalo: la portada y `/buscar` responden 200 por https.
2. **Buzón.** Cloudflare → tu dominio → **Email** → **Email Routing**: activa, crea la dirección que será el
   remitente (p. ej. `alertas@<tu-dominio>`) y apúntala a tu correo personal (verifica ese destino una vez).
   Compruébalo con `dig MX <tu-dominio>` (tres `route*.mx.cloudflare.net`) y el SPF en TXT.
3. **Brevo.** Crea la cuenta con el sitio real, verifica el teléfono (sin eso no deja enviar), y en
   **Settings → Senders, domains, IPs → Domains → Add a domain** elige **Automatic** (conecta con Cloudflare y
   pone DKIM, DMARC y el código de verificación). Añade el remitente (`alertas@<tu-dominio>`).
4. **Llave de Brevo.** **SMTP & API → API keys → Generate**: acceso **Restricted** y solo **Transactional
   email = All**; caduca al año o a los **90 días sin uso** (si el ensayo general pasa de eso sin enviar,
   genera otra). **No actives** «Activate for API keys» (bloqueo por IP): el Worker no tiene IP fija.
5. **Secretos.** Los cuatro de 6.1 con `wrangler secret bulk` desde un archivo temporal que se borra.
6. **URL de la app.** `NEXT_PUBLIC_APP_URL=https://<tu-dominio>` en `.env.local` **antes** de `pnpm deploy:cf`
   (la lee `next build`: de ahí salen `og:image`, los enlaces de los correos y las campañas). Tras el deploy,
   comprueba que ninguna página nombra la dirección de pruebas de Cloudflare (la del subdominio gratuito del Worker).
7. **Prueba real.** Crea una alerta con tu correo, confírmala y comprueba que el correo llega (en la primera
   semana puede caer en _Promociones_: es normal en un dominio nuevo).

**Aviso conocido (Brevo, 2026-10):** el _subdominio de marca_ que Brevo propone (`mail`) reescribe los enlaces
por un host de rastreo (`r.<subdominio>`) cuyo certificado tarda hasta 24 h en emitirse; mientras tanto el
botón del correo muestra «Tu conexión no es privada». Brevo **no permite apagar el rastreo de clics** en
correos transaccionales (solo Enterprise, por petición) ni quitar el subdominio sin borrar el dominio. Si a las
24 h sigue roto: borra el dominio en Brevo y vuélvelo a añadir **sin** subdominio de marca (los registros de
autenticación se conservan). Deuda H-3: el token del enlace (`#c=`/`#t=`) transita por el host de rastreo.

### 6.3 [TÚ] Probar la cédula con la cuenta real (ensayo general)

Con `DIDIT_API_KEY` puesta: en `/identificarse` valida **tu propia cédula** (la fecha de expedición está
al respaldo). Debe quedar «Identificado». Prueba también con un nombre mal escrito: debe decir «los datos
no coinciden» y gastar un intento. Cuenta cada consulta contra los 40 gratis del mes.

## Deuda K1 — Colima (Supabase local para e2e reproducible)

Para correr los e2e fuera de CI (deuda del S1):

```bash
brew install colima docker
colima start
pnpm exec supabase start   # aplica migraciones
pnpm exec supabase status -o env ...   # exporta URL/keys a .env.local (o usa el bloque de CI)
pnpm test:e2e
```

Alternativa si no quieres runtime local: un proyecto Supabase cloud "dev" (~5 min en el dash).

---

## Al terminar

- [ ] Registro de prueba visible en el panel.
- [ ] Ping y vigencia en verde en Actions (disparo manual con `gh workflow run`).
- [ ] `supabase migration list --linked` sin diferencias.
- Hecho en el S9: el dominio propio, conectado al Worker (ver 6.4). Pendiente para H-4 (publicar de verdad): quitar el `noindex` y el texto legal definitivo
  de `/privacidad` (el correo del responsable ya entra por `NEXT_PUBLIC_RESPONSABLE_CORREO`).

## Problemas conocidos y su solución

| Síntoma                                 | Causa probable                                       | Fix                                 |
| --------------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| `db push` pide contraseña               | el link de 1.3 no guardó la DB password              | repetir `supabase link`             |
| Panel dice "No pudimos cargar" en cloud | migración sin aplicar o usuario sin crear            | 1.4 / 1.5                           |
| `wrangler deploy` falla por `workerd`   | build nativo aún ignorado                            | paso 3.2                            |
| 429 al probar el registro varias veces  | rate limit real (3/hora por IP) — funciona como debe | esperar 1 h o probar desde otra red |
