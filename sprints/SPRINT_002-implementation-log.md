# Bitácora de implementación — Sprint 002 «El inmueble completo»

> App: Innmobiliaria · Rama: `sprint-002/inmueble-completo` · Ciclo: sprint **2 de 3** (fase 1
> seller-first) · Horizonte: H1 (noindex se mantiene) · IA: cero (gate de fotos determinista).
> Plan aprobado: ver `SPRINT_002.md` + orden (planeadora). Fuente viva del avance; la planeadora
> lo lee, no le reporto a mano.

## Fases

- **Fase 0 — Setup + deuda K1 + deltas kit** — 🔨 en curso
- **Fase 1 — Migración 2 + motor puro** — ⏳
- **Fase 2 — Fotos→R2 + Mi anuncio + confirmación** — ⏳
- **Fase 3 — Ficha pública + panel + verificación** — ⏳
- **Fase 4 — Calidad + guía v2 + deploy + cierre** — ⏳

---

## Fase 0 — Setup

### Deltas del kit aplicados (la orden los trae; el repo estaba en v1.6.2)

- **v1.6.3 — carnada canónica gitleaks:** `CLAUDE.md` regla 7 += `AWS_ACCESS_KEY_ID=AKIAQ7RTZ4PXKM2WNB3S`
  (verificada). Hook probado en vivo: staged de un archivo con la carnada → `gitleaks protect
  --staged` → "leaks found: 1". Gate vivo.
- **v1.6.4 — Supabase-en-CI:** `.claude/skills/testing-patterns.md` += sección "e2e con base de
  datos real (Supabase) en CI" (6 reglas: comillas de `status -o env` · `stdout:"pipe"` · GRANTs
  explícitos · rate limit off solo en CI · strict mode por-proyecto · nube temprana). Este repo ya
  lo practica desde S1; ahora está documentado en el skill local.
- **v1.7.1 — Cierre de CICLO:** `CLAUDE.md` gana el bloque "Cierre de CICLO" en el workflow +
  párrafo de publicación del design system en la regla 10. **NO se ejecuta en S2** (es el 2 de 3);
  queda escrito para S3. Plantilla `docs/BLUEPRINT.plantilla.html` copiada del kit sin instanciar.

### Deps

`aws4fetch@1.0.20` (firma R2, edge-safe ~2KB) + `browser-image-compression@2.0.2` (compresión
client-side). `@aws-sdk` PROHIBIDO (peso del Worker free).

### Spike presign R2 (verificación de supuestos, riesgo #1)

`src/lib/r2.ts` con aws4fetch. Spike offline con creds dummy → firma un PUT presigned válido
(host/path/signature/credential/expires/algoritmo AWS4-HMAC-SHA256 correctos). aws4fetch usa
WebCrypto (SubtleCrypto), idéntico en Node y workerd → bajo riesgo en runtime Workers; la
validación end-to-end en workerd real llega en Fase 2 con el endpoint + `pnpm preview:cf`.

#### Desviación del plan (menor) — content-type NO se firma con `signQuery`

El plan asumía que el content-type quedaría en `X-Amz-SignedHeaders` (atando la subida al tipo).
El spike reveló que **aws4fetch con `signQuery: true` NO firma el content-type**. No es problema:
el navegador envía `Content-Type: image/webp` en el PUT y R2 lo persiste como metadata del objeto
(necesario para servirlo bien desde r2.dev); la firma no lo necesita. El control de la subida es
la **key aleatoria atada al inmueble + expiración de 10 min** (ya era el diseño). `presignPut(key,
expiraSeg)` quedó sin el parámetro `contentType`; se exporta `CONTENT_TYPE_FOTO` para el subidor.
Se refleja en ADR-003.

### Env

`.env.example` += bloque R2 (`R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET/
NEXT_PUBLIC_R2_PUBLIC_URL`) + `NEXT_PUBLIC_APP_URL` (metadataBase/OG). Los secretos van a
`.env.local` + `wrangler secret`, jamás al repo.

### Deuda K1 — Colima (pendiente [TÚ], no bloquea el resto de Fase 0)

El usuario eligió Colima (vs. Supabase cloud dev). Pendiente: `brew install colima docker` +
`colima start` → luego valido la suite e2e S1 en local por primera vez.

---

## Fase 1 — Migración 2 + motor puro (✓)

- **Migración `20260718000001_inmueble_completo.sql`:** tabla `fotos` (portada única por índice
  parcial), 7 columnas en `inmuebles`, enum NUEVO `nivel_verificacion` (no se tocó
  `estado_inmueble`), `generar_slug` con anticolisión + backfill de filas S1, `registrar_fundador`
  → jsonb `{id,slug,token}` (drop+recreate por cambio de retorno), 9 RPCs SECURITY DEFINER con
  GRANTs/REVOKEs explícitos. `obtener_ficha` es whitelist (whatsapp solo con opt-in; matrícula/email
  jamás).
- **Token:** 256 bits base64url (43 chars) generado en Postgres (pgcrypto), solo hash SHA-256 en BD,
  sin pepper (la entropía ES la defensa). Sin expiración; rotación por el operador.
- **Motores puros (cobertura 98%):** `engine/fotos/gate` (mín 1200/720px, ≤20MB, máx 12),
  `engine/score` (base 40 + [15,5,4,3,3] + 15 desc + 5 portada + 10 contacto; **ancla 55% con la
  primera foto**; 100% NO exige verificación), `engine/slug` (espejo del SQL), `engine/token`. 90
  unit tests.
- **Validación de BD:** diferida a CI/Colima (K1 sin pagar aún). La migración se escribió con
  revisión cuidadosa siguiendo el patrón K5/K6 del S1.

## Fase 2 — Fotos→R2 + mi-anuncio + confirmación (✓)

- **Presign:** `POST /api/fotos/presign` (runtime nodejs) valida token + re-evalúa gate +
  límite → 2 URLs firmadas. `src/lib/r2.ts` (aws4fetch), `fotos-url.ts` (URLs públicas, client-safe),
  `leer-dimensiones.ts` (createImageBitmap, inyectable), `fotos-cliente.ts` (pipeline con import
  dinámico de la compresión).
- **Pantalla `/mi-anuncio`:** shell estático (LCP-safe) + `MiAnuncio` (resuelve token del fragment,
  5 estados) + `ScoreCompletitud` (goal-gradient en vivo) + `SubidorFotos` + `GaleriaEditable` +
  `EditorDescripcion` + `OptInContacto` + `ChecklistEspacios`.
- **Magic link:** el Wizard guarda el link en sessionStorage; `/confirmacion` monta
  `MagicLinkGuardar` (nada si visita directa → conserva su prerender estático).
- **Testing Library entra** (paga deuda S1): 15 tests de componente + cleanup en `tests/setup.ts`.
  e2e `mi-anuncio.spec` + `r2-mock` (intercepta R2; gate/compresión/presign/RPC reales).
- **Deps nuevas:** `@testing-library/user-event` (no estaba).

### Desviación del plan (menor) — spike R2: content-type no se firma

Ver Fase 0: con `signQuery`, aws4fetch no firma el content-type. `presignPut(key)` quedó sin ese
parámetro; el navegador envía `Content-Type: image/webp` en el PUT y R2 lo persiste. Sin impacto
de seguridad (la key aleatoria atada al inmueble + expiración de 10 min son el control).
