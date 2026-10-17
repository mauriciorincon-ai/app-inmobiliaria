# ADR 009 — Optional email in step 3 of the registration flow

- **Status:** Accepted
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
- **Closed at the end of Sprint 004:** `/privacidad` now says the email is optional, that it is used
  only for campaign notices (photos, seal, validity), that a mail provider acting on our behalf
  receives email and name to send them, and how to ask to stop or to delete it. The text is a
  `{ es, en }` map (`src/app/privacidad/textos.ts`) with a parity test.
- **Found while writing it:** the hint under the field in step 3 says the email is also "to send you
  the founder package", but nothing sends it: the guides are links on the page (ADR 010) and the
  only email templates are the three campaign notices. The policy states what the code does; the
  hint is recorded as debt.

## Alternatives considered

- **Email in step 1:** breaks rule 1.
- **No email, WhatsApp only:** no bulk channel, so every campaign would be manual.
