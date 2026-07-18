# ADR 003 — Fotos en Cloudflare R2 vía presigned PUT client-side (aws4fetch)

- **Estado:** Aceptado
- **Fecha:** 2026-07-18
- **Sprint:** 002

## Contexto

El vendedor sube fotos desde su teléfono. Restricciones: fotos JAMÁS a Supabase Storage
(egress insuficiente — decidido con números en F1), gate de calidad determinista (cero IA), y
el Worker free de Cloudflare tiene un límite de tamaño de bundle estrecho.

## Decisión

**Compresión client-side (`browser-image-compression`, WebP full 1600px + thumb 400px) → el
navegador pide URLs firmadas a `POST /api/fotos/presign` → hace PUT directo a R2 → confirma con
la RPC `registrar_foto`.** La firma usa **`aws4fetch`** (~2KB, WebCrypto), NUNCA `@aws-sdk`
(demasiado pesado para el Worker).

- **Gate determinista** (`engine/fotos/gate`): formatos jpeg/png/webp, mínimo 1200px lado mayor /
  720px menor, ≤20MB de entrada, máx 12 fotos. Corre ANTES de comprimir y de cualquier red; se
  re-evalúa server-side en el presign (defensa en profundidad).
- **Keys** `{inmuebleId}/{uuid}-full.webp` (+ `-thumb` por convención — una sola columna
  `r2_key`). `registrar_foto` valida por regex que la key pertenezca al inmueble del token →
  imposible registrar keys ajenas.
- **Sin HEAD de verificación contra R2:** la key está atada al inmueble del token; registrar una
  key no subida solo rompe la galería del propio anuncio (auto-daño, sin riesgo cross-tenant). El
  HEAD añadiría latencia + una llamada por foto para prevenir nada.

## Hallazgo del spike (Fase 0)

Con `signQuery: true`, **aws4fetch NO firma el content-type** (queda fuera de
`X-Amz-SignedHeaders`). No es problema: el navegador envía `Content-Type: image/webp` en el PUT y
R2 lo persiste como metadata (necesario para servirlo bien desde r2.dev). El control de la subida
es la **key aleatoria atada al inmueble + expiración de 10 min**, no el content-type.
`presignPut(key)` quedó sin ese parámetro.

## Consecuencias

- **Objetos huérfanos** (foto eliminada en BD, o PUT que falló tras el presign): aceptados. R2 es
  barato y la limpieza se evalúa en S3 si el volumen lo amerita.
- **Fallback documentado** si `aws4fetch` fallara en workerd: proxy por route handler con límite
  de tamaño (no se necesitó — el spike confirmó que firma bien).
- El bundle de compresión entra por **import dinámico** (solo al elegir la primera foto), fuera
  del script inicial de `/mi-anuncio`.
