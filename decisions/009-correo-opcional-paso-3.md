# ADR 009 — Optional email in step 3 of the registration flow

- **Status:** Accepted, with one open item (see Consequences)
- **Decided:** Sprint 003 (user decision at the start gate) · **Written down:** 2026-10-17 (Sprint 004)
- **Sprint:** 003 / 004

## Context

Domain rule 1 caps step 1 at three fields: publishing is the registration, and every extra field
costs sellers. But campaign batches (missing photos, no seal, about to expire) need a second
channel besides one-to-one WhatsApp, and email is the cheapest one to send in bulk.

## Decision

Step 3 of the wizard has an **optional** email field. Step 1 does not change.
`engine/registro/schema.ts` turns an empty value into `null` (`email: datos.email?.trim() || null`)
and `registrar_fundador` stores `nullif(btrim(p_email), '')`. A seller who gives no email publishes
anyway and is contacted one-to-one by WhatsApp.

Only sellers **with** an email enter a batch: `obtener_lote` filters `where ve.email is not null`
and returns email, name and neighbourhood. The email is never public (`obtener_ficha` does not
expose it).

## Consequences

- Minimization (Ley 1581): the email is collected only if the seller chooses to give it, and
  `consentimiento_at NOT NULL` still gates every registration.
- Brevo falls back to a MOCK without `BREVO_API_KEY`; no flow is considered tested with the mock.
- **Open item, not fixed in Sprint 004:** the `/privacidad` text lists name, WhatsApp, city and
  property data as what is collected, and says the email is never public, but it does not say that
  an optional email is collected nor that it is used for campaign notices. The legal text is out of
  scope for Sprint 004 (milestone H-4); it is recorded as debt for the milestone batch.

## Alternatives considered

- **Email in step 1:** breaks rule 1.
- **No email, WhatsApp only:** no bulk channel, so every campaign would be manual.
