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
