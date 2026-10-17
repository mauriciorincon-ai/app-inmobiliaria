# ADR 008 — `/renovar` carries the token in the URL fragment

- **Status:** Accepted
- **Decided:** Sprint 003 (deviation from the plan) · **Written down:** 2026-10-17 (Sprint 004)
- **Sprint:** 003 / 004

## Context

The Sprint 003 plan wrote the renewal route as `/renovar/[token]`, a path parameter. A token in
the path reaches the server, the CDN logs and the `Referer` header of any outgoing request. That
goes against the principle of the magic link in ADR 004: a 256-bit token whose SHA-256 hash is the
only thing stored, and which never touches the server in clear.

## Decision

The route is `/renovar` and the token travels as `#t=<token>`. The browser never sends the
fragment to the server. The page is a static shell: the client reads `location.hash`, loads the
current validity with `obtener_mi_anuncio(p_token)`, shows a single "renew" button and, on click,
calls `renovar_vigencia(p_token)` (ADR 007). Both are RPC POSTs.

It reuses the same token as `/mi-anuncio` (one active token per property). Renewing does not mint
a new token; the operator's `generar_link_anuncio` still rotates it and kills older links.

## Consequences

- The token never appears in access logs or in the Worker's request URL.
- Analytics: the PostHog wrapper has autocapture and pageviews off, and today its three events
  (`landing_vista`, `publicar_paso1`, `registro_publicado`) fire only on `/` and `/publicar`. If an
  event is ever added to `/renovar` or `/mi-anuncio`, PostHog's `$current_url` would carry the
  fragment, so that event must strip it first.
- The page is `noindex` and has no server-side data fetching.
- It needs JavaScript. That is acceptable: the whole seller flow already calls RPCs from the client.
- A scanner that follows the link only gets the shell. Renewing needs a human click, so it cannot
  extend a listing by accident.

## Alternatives considered

- **`/renovar/[token]` (path):** rejected for the log exposure above.
- **Query string `?t=`:** same exposure as the path.
