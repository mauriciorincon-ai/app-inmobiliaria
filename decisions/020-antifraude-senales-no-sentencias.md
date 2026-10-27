# ADR 020 — Antifraud: signals, not sentences; pausing a listing is the operator's alone

- **Status:** Accepted
- **Date:** 2026-10-26
- **Sprint:** 015 (rules, reports, queue), 016 (a resolved flag comes back only if its data changed; a requested CTL that never arrives has an exit)

## Context

The product promise is «verified on both sides». Verification of the owner (CTL seal) and of the buyer (WhatsApp) does
not stop a cloned listing, a price too good to be true or one phone behind several names. Sprint 015 added written rules,
a «report» button and an operator queue. Three constraints shape how:

- **A signal is not proof.** A price 30 % under the zone's median is also a distressed sale; a repeated photo is also an
  owner with two properties. Hiding a listing on a guess can hurt an honest owner and is a statement the platform
  cannot back.
- **Reports are a weapon.** If a report hides a listing, anyone can take down a competitor's. If the owner learns who
  reported, reporting stops.
- **The code decides, not a model.** The rules are deterministic (rule 14 of the constitution: code first); a person
  reads each flag.

## Decision

1. **Four written rules, and only flags.** Price (the m² at 30 % or more under the median of at least 5 comparables, the
   same threshold as «Is it overpriced?»), photo (two 64-bit fingerprints at Hamming distance 6 or less, ignoring nearly
   flat ones), registration number (the same one with another phone) and phone (the same WhatsApp with two names or more).
   A daily job and a button run them. They write rows into `banderas`; **they never change what anyone sees.**
2. **A report is an input, not an action.** Any buyer with a verified WhatsApp can report a listing (one per listing,
   at most 5 a day, free text up to 500 characters). The owner is not told who reported and the queue shows neither name
   nor number.
3. **Only the operator acts**, with four actions: pause (`pausado_at`: off the search, the listing's own link, contact
   and viewings; reactivating brings it back), ask the owner for a CTL (the listing stays visible; a verified seal drops
   to «re-verification pending» until a new CTL ≤ 30 days is registered), close that request when the owner never sends it
   (`cerrar_ctl_pedido`, Sprint 016: the listing returns to «founder» with the date recorded, the seal is neither granted
   nor removed by itself) and dismiss with a reason from a closed list (the signal does not come back). The app writes the
   WhatsApp text in the owner's language; **the operator sends it by hand.**
4. **Pausing is closed at the catalogue.** Every function that reads `inmuebles` is classified in a gate over `pg_proc`
   (`tests/e2e/utils/puertas-pausa.ts`): a new function that reads listings without respecting the pause fails the suite.
5. **A flag resolved with «pause» comes back only if its data changed** (G-Plan decision 1b, Sprint 016). On resolving,
   `banderas.dato_al_resolver` keeps the datum that triggered it (price, photo, registration number or phone);
   `aplicar_banderas` reopens it only if the listing is no longer paused and that datum is different. A dismissal is
   final. `dato_de_bandera` is not callable by `anon` or `authenticated`.
6. **Texts name the signal, never the guilt:** «a price under its zone's median», never «a scam».

## Alternatives considered

- **Hide on a threshold or on N reports.** Fast, and wrong in both directions (false positives; a coordinated takedown).
  Rejected.
- **A classifier or an LLM to score listings.** Needs training data the product does not have and cannot explain a
  verdict in a sentence; the rules can. Rejected for now (constitution rule 14).
- **Reopen every resolved flag on every run.** The operator would see the same listing forever. Rejected: it comes back
  only when the data changed.
- **Show the reporter to the operator.** Useful for follow-up, harmful for the reporter. Rejected.

## Consequences

- A person has to read the queue; with many flags it grows (the queue returns the 200 most recent). Daily is the cadence.
- The price rule only speaks with 5 or more comparables; with fewer it says nothing.
- **Known limits, for H-3:** the photo fingerprint is computed by the client (an operator button processes the photos
  uploaded before Sprint 015); the 6-bit threshold was not validated with real photos; the price rule is O(n²) per group
  (measured: 13.4 s with 17,000 listings in one group in a local database; milliseconds with dozens).
- The WhatsApp message the operator sends goes out from their own phone: Innmobiliaria still never sends one (ADR 015).
