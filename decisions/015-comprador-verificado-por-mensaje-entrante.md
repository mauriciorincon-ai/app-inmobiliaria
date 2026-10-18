# ADR 015 — A buyer is verified by an inbound message, and the app never sends one

- **Status:** Accepted
- **Date:** 2026-10-18
- **Sprint:** 007

## Context

Sprint 007 makes «verified on both sides» true: to contact an owner, a buyer proves the WhatsApp number is
theirs, and every contact is recorded for both. Three constraints shape how:

- **Innmobiliaria never sends a WhatsApp message** (G-Plan decision 2a). Sending costs money per
  conversation and needs approved templates; receiving is free. A buyer who messages us opens the window,
  and we never use it.
- **The owner's WhatsApp is shown only to a verified buyer** (G-Plan decision 3a). Until now
  `obtener_ficha` returned it to anyone when the owner had opted in.
- **The seal must not be forgeable.** Sprint 006 added `marcar_verificado_ctl`, which refuses a CTL older
  than 30 days, but left the old `marcar_verificado` granted and the operator able to write
  `ctl_expedido_el` through the row policy.

## Decision

1. **Verification by inbound message.** The page asks for name and number plus the Ley 1581 consent, then
   shows a one-time code (`INN-` and six symbols from a 32-symbol alphabet, no I/O/0/1). The buyer sends
   that code from their WhatsApp to Innmobiliaria's number; Meta delivers it to a webhook; the page notices
   by short polling. The code lives 10 minutes, is used once, and only its SHA-256 is stored.
2. **The number must match.** `canjear_codigo_whatsapp` compares the sender reported by Meta with the number
   the buyer declared. A code that arrives from another number is burned and the buyer is told so.
3. **The webhook is the only writer.** It validates `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with
   the app secret, constant-time comparison) **before** parsing the body, always answers 200 without leaking
   state, and calls `canjear_codigo_whatsapp` with the service key. That function is granted to
   `service_role` only; `anon` and `authenticated` cannot call it. The service key is read by one module that
   only the webhook imports (a unit test enforces it). Secrets and Innmobiliaria's number live only in the
   Worker's variables, never in the repository.
4. **The session is a cookie, the database keeps its hash.** A random 32-byte value in an `httpOnly` cookie
   identifies the buyer's browser; the base stores only its SHA-256, the way the magic link already works
   (ADR 004). Verified means «some code of this session was used».
5. **What the base keeps** (Ley 1581, minimisation): buyer name, Colombian E.164 number, language, consent
   time and verification time; per attempt, the code hash, the session hash and the IP hash with the
   existing pepper; per contact, who wrote to which listing and when. Never the code, the message body or
   the cookie in clear. RLS is on for the three tables with no policy for `anon` or `authenticated`.
6. **The number leaves the database once, on purpose.** `registrar_contacto(session, slug)` returns the
   owner's WhatsApp only for a verified session and a live listing with the opt-in, and records the contact.
   `obtener_ficha` no longer carries `whatsapp`. The owner sees contacts in «Mi anuncio» with name, the last
   four digits and the date; the full number is already in their WhatsApp.
7. **The seal is closed at the table.** A `before update` trigger refuses a change to `nivel_verificacion`,
   `ctl_expedido_el`, `matricula` or `verificado_at` when `current_user` is `anon` or `authenticated`.
   `marcar_verificado_ctl` is `SECURITY DEFINER`, so inside it `current_user` is the owner and it still
   writes. `postgres` and `service_role` (seeds, maintenance) are not affected. The legacy
   `marcar_verificado(uuid, text)`, which verifies without a CTL date, loses its `authenticated` grant; the
   function stays only for data from before Sprint 006.

## Alternatives considered

- **Send the code by WhatsApp or SMS.** Costs per message, needs a template and a provider, and makes
  Innmobiliaria a sender. Rejected (2a).
- **A transaction-local flag (`set_config`) to authorise seal writes.** Works, but every seed and test that
  writes the seal as `postgres` would need it. Checking `current_user` closes the API roles and leaves the
  rest untouched.
- **Return the owner's WhatsApp from `obtener_ficha` and hide it in the UI.** The number would still be in
  the public response. Rejected.
- **Foreign numbers.** The mockup and the engine accept Colombian mobile numbers only; a buyer abroad cannot
  verify yet. Recorded as a limit, to revisit when the English side is used by people outside Colombia.

## Consequences

- The deployed Worker of Sprint 006 stops showing the owner's WhatsApp as soon as migration 9 is applied
  (the field is gone). That is the closing of 3a, and the reason the migration needs the owner's explicit
  «yes» before it touches the cloud.
- Real verification needs a Meta app with the WhatsApp product, a number that is not already in the
  WhatsApp app, and three Worker secrets. Tests never need Meta: they post signed payloads.
- **Known limit, for H-3:** the per-session and per-IP caps live inside `iniciar_verificacion`, but the
  hashes are passed by the caller, so someone calling the RPC directly can choose fresh ones. It can create
  junk rows; it cannot verify a number it does not hold, because a code is only redeemed by a signed
  message from that number. General rate limiting is H-3.
- An existing buyer name cannot be rewritten by asking for a code once the number is verified.
