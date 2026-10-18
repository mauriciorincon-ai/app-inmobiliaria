# ADR 017 — Save and be told: favorites without an account, shared lists, and email alerts with double confirmation

- **Status:** Accepted
- **Date:** 2026-10-18
- **Sprint:** 009

## Context

Sprint 009 lets a buyer **save** listings (a heart), **compare** up to four, **decide with someone else** through
a shared list with notes, and **be told by email** about new listings and price drops in a search. Constraints:

- **Browsing is free** (mockup decision 2): saving and creating an alert ask for nothing. Writing to an owner,
  asking for a visit and writing notes need a verified WhatsApp (ADR 015).
- **Innmobiliaria never sends a WhatsApp message** (ADR 015). «Share» opens the buyer's own WhatsApp; the buyer
  is the sender. «Also on WhatsApp» in the mockup is out of scope.
- **An email address is not proof of anything.** Anyone can type anyone's address into an alert. Nothing may be
  mailed to an address that did not confirm it.
- **Brevo's free plan gives 300 emails a day for everything**: operator campaigns (`envios`), visit notices
  (ADR 016) and now alerts. A visit reminder must never lose its slot to a digest.
- **Nothing could lower a price.** `precio_esperado` was written once, by `registrar_fundador`. A «price dropped»
  alert would never fire.
- The cron already exists (ADR 016): one daily Cron Trigger at 8:00 Bogotá that calls `/api/cron/diario`.

## Decision

1. **Favorites live on the phone and merge into the account on verification.** `localStorage` holds up to 100
   slugs. When the WhatsApp becomes verified, the client sends them to `fusionar_favoritos`, which inserts the
   visible ones with `on conflict do nothing` (no duplicates) and keeps the 100 newest. The session cookie is
   `httpOnly`, so the browser never reads it: it learns «verified» from `/api/verificacion/estado`.
2. **Lists belong to a verified buyer and are shared by a revocable link.** `compartir_lista` mints a 32-byte
   token, returns it once and stores only its SHA-256 (`compartir_hash`). Sharing again replaces the old link;
   `revocar_lista` clears it. The link lives in the URL **fragment** (`/lista#t=…`), never the query. Whoever
   opens it sees the list; to write a note they must have a verified WhatsApp. A note shows only the author's
   **first name**; no phone, email or address ever leaves, and `/privacidad` says so.
3. **Alerts are created by the server, never by `anon`.** `crear_alerta` is `service_role` only: it returns the
   _confirm_ token, and if `anon` could call it, anyone could confirm an address that is not theirs. The route
   validates the input, hashes the IP, sends the confirmation email, and returns only the _manage_ token to the
   browser.
4. **Three tokens per alert, one purpose each, only hashes stored** (`enlaces_alerta`):
   _manage_ (kept by the phone that created the alert, and sent in every email), _confirm_ (email only, one use,
   7 days) and _unsubscribe_ (only unsubscribes). Tokens travel in a POST body or a URL fragment, never in a
   query string, with **one deliberate exception**: the `List-Unsubscribe` header (RFC 8058) carries the
   _unsubscribe_ token in the query of a POST URL, because mail clients require it. That token can do nothing
   but unsubscribe. Every email gets fresh tokens (the database cannot re-print a stored hash); the ones minted
   for emails expire after 60 days, the manage token a phone saved lives as long as the alert.
5. **Unsubscribing is one click and needs no session.** The email links to `/baja#t=…`; the page performs the
   POST on load (a link scanner that does not run scripts unsubscribes nobody), and the header does it for the
   mail client's own button. Unsubscribing and deleting are the same operation: `baja_at`. The row stays 30
   days so the per-email cap keeps counting.
6. **Double confirmation before anything is mailed.** The first email carries only «confirm» (and «I did not ask
   for this»). The digest query requires `confirmada_at`; a test proves an unconfirmed alert with matching
   listings gets nothing. Abuse: 3 alerts per email and 10 per IP every 24 h (counted even after deletion), and
   an address that rejected an unconfirmed alert gets none for 30 days; all three answer with the same code so
   nobody learns which applied. Unconfirmed alerts are purged after 7 days. Consent (Ley 1581) is a required
   checkbox: `consentimiento_at not null`.
7. **One daily digest, claimed atomically.** `reclamar_resumenes` (service only, advisory lock) takes confirmed,
   active alerts without a digest today and looks at their **window** `[desde_at, now]`:
   _new_ = matching listings created in the window; _drops_ = matching listings that existed before the window
   whose current price is **lower than their price when the window opened** (the `anterior` of the first change
   inside it). Dropping and rising back, or a rise alone, mails nothing. Alerts with something to say and room
   in the quota are **claimed in the same statement** (`ultimo_envio_at`, a fresh window, the tokens), so an
   alert gets at most one digest a day; if Brevo fails afterwards the digest is lost, never duplicated (the
   same trade as ADR 016). Alerts with nothing advance their window. Alerts the quota left out do **not**
   advance: they go tomorrow with the full window, nothing is lost. Resuming a paused alert starts the window
   at «now».
8. **«Matches» means exactly what `/buscar` means.** The `where` of `buscar_inmuebles` moved into
   `inmuebles_que_cumplen`, and the whitelist of fields into `fila_anuncio`. `buscar_inmuebles` was rebuilt on
   both with the **same signature, output, order and 60-row limit**; alerts use the first without the limit.
   A test compares both on a matrix of criteria. The polygon check lives in `validar_poligono`.
9. **A shared daily email quota, visits first.** `correos_dia(dia, visita, alerta)` counts by Bogotá day. Visit
   mail is **counted, never blocked**. Alert emails (confirmations and digests) **reserve** quota first, while
   `visita + alerta + envios(today) < 250`, leaving 50 of Brevo's 300 for visit mail and drift. The cron runs
   reminders first, then digests.
10. **Owners can change the price.** `guardar_precio(p_token, p_precio)` (same range as the column, at most 5
    changes in 24 h) and a trigger that writes `cambios_de_precio(anterior, nuevo)`. Without it no listing could
    ever drop. The history is kept 90 days. There is **no HTTP route** for it: «My listing» already calls its own
    RPCs from the browser with the owner's private token, so the price editor does the same.
11. **An alert nobody asked for is rejected from its confirmation email, not by its creator.** Migration 13
    adds `alertas.rechazada_at`. The confirmation email carries a «I did not ask for this» link built from an
    unsubscribe token that `crear_alerta` now also returns (migration 12 returned only the manage and confirm
    tokens). Only that path (an unconfirmed alert unsubscribed from the email) marks the rejection and blocks
    the address for 30 days; someone who creates an alert and deletes it from their own phone before confirming
    is not locked out of their own address.
12. **Why not WhatsApp, and why not «as soon as it appears».** WhatsApp would make Innmobiliaria a sender
    (templates, per-message cost, opt-in rules). «As soon as it appears» needs a trigger per listing and
    breaks the quota in a burst; the approved plan (G-Plan 1a) is a single digest at 8:00.

## Alternatives considered

- **Let `anon` call `crear_alerta` and return both tokens.** Whoever calls the RPC directly would hold the
  confirm token and could confirm any address. Rejected: the server holds it.
- **One token for everything.** A leaked unsubscribe link would then manage or read the alert. Rejected: one
  purpose per token.
- **Store the tokens in plain text** so emails could repeat them. A database dump would then unsubscribe or
  manage everybody's alerts. Rejected: fresh tokens per email, hashes only.
- **An account for saved things.** Contradicts the mockup («you don't need an account»); verified WhatsApp is
  already the identity for everything that writes.
- **Server-side favorites for everyone.** Needs a session; anonymous buyers would lose the heart. The phone is
  the store until the buyer verifies.
- **Duplicate the search `where` for alerts.** The two would drift and an alert would announce what `/buscar`
  does not show. Rejected: one function.
- **Block visit mail when the quota is full.** A reminder is worth more than a digest. Rejected: visits are
  counted, alerts yield.

## Consequences

- The Worker of Sprint 008 keeps working after migration 12 (nothing is revoked, no signature changes). The new
  screens and routes need the Sprint 009 Worker.
- A new personal datum exists: the alert's **email address** (the buyer's, typed on the alert; not linked to a
  buyer record) plus the search criteria. Retention: 7 days if unconfirmed, 30 days after unsubscribing.
- The module allowlist for the service-role client grows by **one** (`lib/alertas-correo`, used by the alert
  routes and the cron); `servicio-aislado.test.ts` enforces it.
- Listings that come back after expiring are **not** «new» (new = created in the window). A drop is measured
  against the price at the start of the window, so an owner who raises and then lowers the price on different
  days can announce a «drop» to the original price; that is a real change for a buyer who saw the higher one.
- Migration 13 (`alertas_rechazo`) is additive: one column and two `create or replace` functions with the same
  signature. It reached the cloud project in a separate step from migration 12.
- **Known limits, for H-3:** no general rate limiting; «My alerts» lives in the phone (and in the links of the
  emails), it is not tied to the account; a Brevo outage after a claim loses that day's digest.
