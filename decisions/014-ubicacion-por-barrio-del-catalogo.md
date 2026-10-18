# ADR 014 — A listing is located by its cadastral neighbourhood, never by a point

- **Status:** Accepted
- **Date:** 2026-10-17
- **Sprint:** 006

## Context

Sprint 006 opens the first buyer-facing door: `/buscar`, with filters, a list and a map where the buyer
draws a zone. Three constraints shape how a listing is placed on that map:

- **The exact address never leaves the database in a public answer** (G-Plan decision 1a). Showing a
  pin would reveal it; so would a zone narrow enough to isolate one building.
- **No PostGIS.** The plan only wanted it «if the query demands it».
- **Production is a Cloudflare Worker** (ADR 001): the map must not bloat the script budget of the
  pages that do not use it, and its tiles must not depend on a service we cannot replace.

## Decision

**1. The public location of a listing is the _area_ of its neighbourhood.** The catalogue is the
**«Sector catastral»** dataset of Catastro Bogotá (UAECD), licence **CC BY 4.0**, version 09.26: 1 230
sectors (1 000 urban, 139 rural, 91 mixed) with a unique 6-digit code. Every map shows the attribution
«Barrios: Catastro Bogotá (CC BY 4.0)». `scripts/sectores/convertir.mjs` turns the raw GeoJSON (18 MB,
not versioned) into three committed outputs that must say the same thing and are cross-checked by
`tests/unit/catalogo-sectores.test.ts`: the engine catalogue (`src/engine/zonas/sectores.json`), the
`insert` block of the migration, and the simplified map geometry (`public/datos/sectores.geojson`,
Douglas-Peucker at ~13 m, outer ring only, ~690 KB, large sectors drawn first so small ones sit on top).

**2. Each sector has one interior point, its `centroide`.** It is the area centroid, or — when the sector
is concave and the centroid falls outside it — the middle of the widest stretch of the horizontal line
through the centroid. It is stored as the native Postgres `point` (x = longitude, y = latitude). The same
point assigns the sector to a locality (the locality polygon that contains it).

**3. A zone drawn by the buyer is a native `polygon`, and a listing is inside it when the polygon
contains the _centroid of its neighbourhood_.** `buscar_inmuebles` tests `polygon @> point`: **no
PostGIS**, no extension to provision, and nothing finer than a neighbourhood can be inferred from the
answer. The zone comes in as text, is validated in the app (3–100 vertices, inside Bogotá, not
self-crossing, ≥ 0.05 km²; `src/engine/busqueda/poligono.ts`) and again in the RPC (3–100 vertices,
`poligono_invalido` otherwise). A listing without a catalogue sector is still found by filter but never
by zone: no point is invented for it.

**4. The sector is set by the database, not by the caller.** `registrar_fundador` keeps its 16-argument
signature (changing it is `DROP` + `CREATE`, not additive). A trigger on `inmuebles` (`before insert or
update of barrio`) matches the typed neighbourhood to the catalogue by **exact name inside the
locality**, ignoring case, accents and punctuation (`public.clave_barrio`, mirrored by `claveBarrio` in
the engine). The wizard offers the catalogue in a select, so every new listing matches; existing ones
are back-filled in the migration; the rest keep `sector_codigo = null` and wait in the operator queue.
An explicit assignment by the operator wins over the name match. Names that Catastro repeats inside a
locality are disambiguated by code order (` (2)`, ` (3)`) so the name stays a key.

**5. The public search is a whitelist.** `buscar_inmuebles` is `SECURITY DEFINER`, executable by `anon`
(added on purpose to the whitelist in `permisos-funciones.spec.ts`), and returns exactly: slug,
operation, type, neighbourhood, sector code, locality, area, rooms, price, level, CTL date, expiry and
cover photo. **Never `direccion_aproximada`, never anything of the seller.** Only unexpired listings,
most recently confirmed first, capped at 60. `tests/e2e/rls.spec.ts` asserts the exact key list and that neither the address nor the seller appear; the
gate was shown failing by temporarily patching the local function to leak the address.

**6. The seal carries the date of the CTL.** `marcar_verificado_ctl(uuid, text, date)` (operator only)
requires a CTL issued within the last 30 days (Bogotá date, no future) and stores the date; the CTL
document is still never stored. The seal has three states derived without a clock from the presence of
the date: founder · verified (date shown) · **re-verification pending** (verified before the date
existed). The 30 days are enforced when the date is _registered_, not when it is shown.

**7. The map.** MapLibre GL in its own lazily loaded chunk (never on pages that do not draw a map; the
list renders first). Style from `NEXT_PUBLIC_MAPA_ESTILO_URL`, default **OpenFreeMap** (`liberty`): no
key, no registration, commercial use allowed, no view limits; attribution is added by MapLibre and
extended with Catastro. If the style fails to load the page shows «map unavailable» and the list keeps
working.

## Fallback procedure for the tiles (not provisioned)

OpenFreeMap is a free public service, so the app must be able to leave it. Procedure, to run only if it
disappears or changes its terms: (1) build a **PMTiles** archive of the Bogotá area from OpenStreetMap
data (ODbL; the attribution stays); (2) upload it to the existing R2 bucket with a public custom-domain
route (never an `r2.dev` URL in the repo); (3) point `NEXT_PUBLIC_MAPA_ESTILO_URL` at a style that reads
it. The code does not change. Nothing is provisioned now (G-Plan 3a).

## Consequences

- A buyer can learn only the neighbourhood of a listing; the exact address is given by the owner, to a
  verified buyer, in a later sprint.
- The catalogue is a frozen snapshot of Catastro's 09.26 version. A new version is a new migration (the
  stored `sector_codigo` of a listing never changes under it) plus a re-run of `convertir.mjs`.
- Listings published before the catalogue whose neighbourhood was typed freely are searchable by filter
  but not by zone until the operator assigns a neighbourhood.
- Everything here is additive: one table, two columns, one trigger, four new functions
  (`clave_barrio`, `fijar_sector`, `marcar_verificado_ctl`, `buscar_inmuebles`) and three `create or replace`
  (`obtener_ficha`, `obtener_mi_anuncio`, `obtener_lote`) with unchanged signatures. The Worker deployed before the migration keeps working.
