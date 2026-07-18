# ADR 005 — Ficha pública por RPC de columnas públicas + OG sin generación de imágenes

- **Estado:** Aceptado
- **Fecha:** 2026-07-18
- **Sprint:** 002

## Contexto

Cada inmueble tiene una ficha pública compartible por WhatsApp (`/i/[slug]`), servida a usuarios
anónimos. Contiene datos de terceros → Ley 1581 aplica DOBLE: minimización + opt-in de contacto.

## Decisión

**La ficha se lee por la RPC `obtener_ficha(slug)` `SECURITY DEFINER` que devuelve una WHITELIST
de columnas públicas.** `anon` no tiene ninguna política sobre las tablas (patrón ADR-002).

- **Contacto solo con opt-in:** `whatsapp` se devuelve únicamente si `contacto_publico = true`
  (el vendedor lo activa en "mi anuncio", reversible). Por defecto, `null`.
- **Matrícula y email JAMÁS** salen de la RPC (ni con opt-in). Test negativo triple: a nivel RPC
  (rls.spec), en el DOM (ficha.spec) y por ausencia de la clave en el payload.
- **Nombre del publicador SÍ es público:** es parte del modelo de confianza (identidad visible >
  reviews, Ert et al. 2016; el nivel 1 "Fundador" ES nombre/foto visible). Se declara en
  `/privacidad` (sección "Qué aparece en tu ficha pública").
- **`noindex` se mantiene** en H1; la difusión abierta llega en S3 (G-Release).

## OG sin generar imágenes

**`og:image` = la foto de portada real desde r2.dev**, o un **fallback estático**
(`public/og-fallback.png`, 1200×630) cuando no hay fotos. **PROHIBIDO** generar imágenes en
runtime (satori/next-og en Workers = riesgo innecesario). `metadataBase` (`NEXT_PUBLIC_APP_URL`)
hace absolutas las OG relativas — WhatsApp ignora las relativas.

## Lighthouse

`/i/[slug]` es dinámica (lee la BD) → el job `lighthouse` levanta Supabase real y siembra una
ficha demo SIN fotos (`scripts/seed-demo.mjs`, slug `demo-apartamento-chapinero`): audita el
estado sin-fotos, con LCP real y estático. El LCP con foto R2 real no es auditable en CI sin
bucket → lo cubre el gate ⭐ en teléfono. La portada usa `<img fetchPriority="high">` + `preload`
(no next/image: el WebP ya está optimizado).
