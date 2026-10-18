# ADR 016 — Identity through a provider with a hard cap, and the visit reminder goes by email

- **Status:** Accepted
- **Date:** 2026-10-18
- **Sprint:** 008

## Context

Sprint 008 lets a buyer **identify** with their cédula, **request a visit**, and lets the owner and the buyer
**agree on a time** and be reminded the day before. Four constraints shape how:

- **Innmobiliaria never sends a WhatsApp message** (ADR 015). The reminder cannot go there, and the owner has
  no buyer number unless the buyer opened a chat.
- **The cédula must not be stored anywhere** (Ley 1581, minimisation): not in a table, not in a log. A third
  party (the identity provider) receives it, and it charges per query.
- **Money is capped by the owner of the product**: at most 40 provider queries a month (G-Plan 1a). The real
  provider account is created only at the dress rehearsal of H-2, so everything runs on a deterministic
  simulator until then.
- **There is no scheduler yet.** The only recurring job is a GitHub workflow that calls an RPC (`vigencia.yml`).

## Decision

1. **The provider is called last.** The route validates the input (Zod), asks the database to **reserve** a
   query (`reservar_consulta_identidad`, `service_role` only), calls the provider only if the reservation was
   granted, then closes it (`registrar_identificacion`). The caps live in the database: 40 per month and 5 per
   day for the whole platform (Bogotá time) and 3 failed attempts per buyer. `pg_advisory_xact_lock`
   serialises concurrent reservations, so two buyers cannot take the last slot. With no slot there is no
   call and no charge. A `no_disponible` result (the provider could not answer) does not use up the buyer's
   attempts.
2. **What the database keeps about an identification:** the fact (`identificaciones`: buyer, provider, date).
   Never the cédula, the issue date or the document (the validated name is written to the buyer's record, see 9). A test lists every column of `public` and fails if one
   looks like a document field; another dumps every table after a simulated identification and looks for the
   synthetic cédula. The logger carries counts only. The buyer can delete the identification at any time
   (`borrar_identificacion`).
3. **The simulator is opt-in; the real key wins; silence is never a simulation.** `IDENTIDAD_MOCK=1` turns on a
   deterministic simulator (one cédula per state of the mockup) for development, CI and tests. A configured
   `DIDIT_API_KEY` always wins over it, so a forgotten mock flag can never hand out the seal with a published
   test cédula. With neither, «Identificarse» answers «not available». The real adapter (Didit
   `POST /v3/database-validation/`, multipart form with `x-api-key`) is written behind the key and **has not
   been exercised**; only `MATCH` with the same name identifies. It is declared as untested until the dress
   rehearsal.
4. **The buyer reaches their own request through a link with a token.** `solicitar_visita` generates 32
   random bytes in the database, returns them once and stores only the SHA-256 (the way `edit_token_hash`
   works). The link goes to the buyer's email and works from any browser. The owner keeps acting through the
   token of «Mi anuncio»; every action is an RPC with `p_token`.
5. **The other person's email never leaves in an API response.** The public RPCs return names, the last four
   digits of a phone and times. The emails come from `datos_correo_visita`, callable only with the service
   key, and the modules allowed to import the service-key client grow by exactly four: the webhook, the
   identity adapter, the visit mailer and the cron route (`servicio-aislado.test.ts` enforces it).
6. **The owner sees the buyer's full WhatsApp number only for a confirmed, not cancelled visit.** That is what
   lets the owner send the exact address from their own WhatsApp. Before that the owner sees the card (name,
   last four digits, identified or not, declared intent, budget and payment, and «attended N of M»).
7. **The reminder goes by email, from a Cron Trigger.** A custom Worker re-exports the OpenNext handlers and
   adds `scheduled`, which calls the app's own `fetch` with `POST /api/cron/diario` and a bearer secret. One
   implementation serves the cron, the tests and the fallback workflow (`curl -f`). The database claims the
   reminders atomically (`reclamar_recordatorios`): an `update … returning` marks `recordatorio_at`, so a
   visit is claimed **at most once** and a cancelled one never. If Brevo fails afterwards the reminder is
   lost rather than sent twice. «Today» is the database's Bogotá date, never the app's clock. Visits for
   tomorrow are reminded; visits for today that have not started are too (those confirmed after yesterday's
   run).
8. **Time is stored in UTC and shown in Bogotá time** (UTC−5, no daylight saving). The `.ics` carries a
   `VTIMEZONE` for `America/Bogota` and is generated in the browser, so nothing about the visit is stored for
   it.
9. **«Identified» is tied to the name the owner sees.** The name the buyer typed when verifying WhatsApp is
   free text; the one compared with the registry is the one typed on the ID screen. On success the buyer's
   stored name becomes the name the registry validated (the one they consented to), and requests that were on
   hold because they were not identified move to pending. If that cannot be completed, the query is closed as
   «not available»: nobody is left «identified» halfway.
10. **Debt of Sprint 007 paid here:** `iniciar_verificacion` takes the consent as a sixth parameter and rejects
    it unless it is `true`; the five-argument version loses its grant to `anon` and `authenticated` (a
    `revoke`, not a `drop`); `registrar_contacto` refuses the 21st distinct listing a buyer contacts in 24
    hours; `purgar_vencidos` deletes unverified buyers after 30 days and expired unused codes after 7, and
    never touches used codes (they are the proof of live sessions).

## Alternatives considered

- **Call the provider first and count afterwards.** The cap would be a report, not a limit: concurrent
  requests overshoot it. Rejected.
- **Keep the cédula hashed.** A cédula has ~10 digits: a hash is reversible by enumeration, so it would still
  be personal data. Rejected; nothing is kept.
- **Send the reminder by WhatsApp or SMS.** Costs per message, needs templates and makes Innmobiliaria a
  sender. Rejected (ADR 015).
- **Let the buyer pick any time.** Needs the owner's calendar. Proposing up to three times is enough for a
  first version and keeps the owner in control.
- **A cron on GitHub Actions only.** Scheduled workflows can be delayed or skipped; it stays as the written
  fallback, not as the primary.
- **A daily cap read from the app.** Two places would hold the number. The route passes the engine's
  constants and the database defaults to the same values.

## Consequences

- The Worker of Sprint 007 stops being able to ask for codes as soon as migration 10 reaches the cloud (its
  call has five arguments). That is why the migration needs the owner's explicit «yes»; the Sprint 008 Worker
  fixes it, so migration and deploy go together.
- A new personal datum exists: the buyer's email, asked only to request a visit and used only for the notices
  of that visit.
- The real identity provider and the Cron Trigger in production are verified at the dress rehearsal of H-2.
  The free Workers plan allows 10 ms of CPU per invocation; the cron measures it under `--test-scheduled`, and
  the fallback workflow is ready if it does not fit.
- **Known limits, for H-3:** an owner without an email receives no notice (they see requests when they open
  «Mi anuncio»); the owner's link in the notice cannot carry their token because only its hash is stored;
  there is no general rate limiting; foreigners cannot identify (cédula de ciudadanía only).
