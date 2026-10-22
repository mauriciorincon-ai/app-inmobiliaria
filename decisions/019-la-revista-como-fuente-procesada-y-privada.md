# ADR 019 — The magazine as a processed, private source, transcribed by Claude Code and not by an API

- **Status:** Accepted
- **Date:** 2026-10-20
- **Sprint:** 011

## Context

New homes are sold with a price «from $X» that hides what a buyer really pays at the keys. The best single source of
what is on sale in Bogotá and the Sabana is a monthly magazine (Estrenar Vivienda, edition 187 at the time of writing),
a 68-page PDF made of images, valid from the 15th of one month to the 15th of the next. Sprint 011 turns one edition
into data so a mockup, and later the product, can show the true price, the wait, the subsidies and an index.

Constraints that cannot be undone once crossed:

- **The repository is public.** Anything committed is cached, forked and indexed even if deleted later. The PDF, its
  rendered pages, the photos and logos, the ad texts, the sales-room phones, addresses and websites, and the QR codes
  are third-party material and personal-looking data. None of it may ever reach the repository.
- **The PDF is not text.** It must be _read_, and reading is a model's job. A magazine is also untrusted input: text
  addressed to an agent («ignore your instructions…») is a prompt-injection attempt, not a request.
- **Numbers must not come from a model.** Reading `$289.900.000` as `$28.990.000` would be wrong without anyone seeing it.
- **Claude Code's subscription may process the user's own work and their operator work, never a third party's request**
  (verified 2026-10-20 in the Claude Code legal page: no routing of requests through plan credentials on behalf of
  users). A paid API for this job would add a cost and a secret to a project whose build cost is zero.
- **Naming real projects and builders in a public repo is a decision**, taken by the user on 2026-10-20: all projects
  go with name and builder, zone and figures; never photos, logos, ad texts, phones, addresses or webs. If the
  publisher objects, the product moves to an aggregated index.

## Decision

1. **The magazine is a private source and is read where it lives.** The PDF stays in the planner's private sources
   folder and is never copied into the repository. Its metadata is not read. Rendered pages, crops, the raw
   transcription and the contacts live in `scripts/vivienda-nueva/crudo/`, **ignored by git**. Nobody visits a URL or
   a QR code of the magazine and nobody contacts anybody.
2. **Claude Code transcribes; no API.** Readers are Claude Code subagents on Sonnet, run in the user's session under
   their subscription (reusable `bandeja-ia` v0.1.0). This is operator work done in the user's own session, not a feature
   of the running app, so rule 14 («code first») does not apply. Each reader writes its JSON to the ignored folder and returns only a summary.
   There is no provider key anywhere (G6) and the bandeja rejects, at registration, any type that declares one.
3. **Only what is processed reaches the repository**, with «Fuente: Estrenar Vivienda, edición 187»: for each project
   its name, builder, zone, type, segment, prices and areas «from», stage, delivery, parking, fixed price, announced
   subsidy and **tags from a closed list** (not free text). The schema is strict: an extra field, a phone, an address
   or a web **fails validation**. What cannot be read is `ilegible`; what the ad does not say is `no_lo_dice`; nothing is
   ever guessed, deduced or completed.
4. **The AI transcribes; pure engines compute.** Every figure shown (true price, wait, subsidy, index, new-or-used,
   affordability) comes from `src/engine/vivienda-nueva/*`, never from a model. A sample of at least 10 % of the
   projects is read twice, by a second reader that does not see the first reading, with **zero discrepancies in prices
   and areas** required; any discrepancy re-reads the whole page and is reported (edition 187: one area, a card cut by
   the page edge and completed from another page of the same project, and one city, where a sales-room address named a
   neighbouring town as a landmark and the project's own ad tag gave the real one; both declared in the sprint's closing note).
5. **A gate keeps it so.** `tests/unit/vivienda-nueva-privado.test.ts` runs in CI: the raw folder is ignored by git, no
   tracked path is a PDF, a raw file or an image of the module, the generated data carries only whitelisted keys and
   closed-list tags, no phone, address, web or email appears in the data, and the module's files carry no web or
   email. Its bait cases (a planted phone, an address, an ad sentence, an unknown key, an un-ignored raw folder) must fall.
6. **The monthly repetition is a bandeja type**, `edicion-del-mes`: a PDF in the sources folder without its
   transcription is a pending job; it expires on the 15th of the next month and is not processed without the user's
   «yes». The result returns to the ignored folder; the repository changes only by pull request.
7. **No rule or subsidy is shown unless it is verified** in its primary source with its year and the date it was
   consulted; the magazine is a lead, never the source. What is not verified (compensation-fund amounts, rate coverage,
   the national savings fund) is named `no_verificado`, carries no figure and is not shown.

## Consequences

- Each month costs one supervised session (render, read, validate, double-read, regenerate) and no money. The
  subscription's ordinary-use limits apply; the job is bounded (about 70 pages, eight readers).
- **The index is only as good as the magazine.** Ads rarely print the neighbourhood, so most zones have fewer than the
  five projects needed for a median: the screen says so instead of inventing one. Coverage of delivery date, stage and
  parking is around 10 %, which is why the «honest sheet» names what the ad does not say.
- The publisher could object to a public list of names with figures. The fallback is already designed: the aggregated
  index, with no per-project data. Withdrawing a project from `datos-187.js` is one regeneration.
- The raw material exists only on the user's Mac. Losing it means re-reading the magazine; the processed data is in git.
- A new edition changes `EDICION` (number, validity) and `PAGINAS_EDICION` in `src/engine/vivienda-nueva/edicion.ts`; the
  scripts follow `EDICION.numero`, readings of another edition in the raw folder are ignored by their `edicion` field, and the
  bandeja delivers `edicion-N.json` only after validating `unida-N.json`. The mockup generator is specific to edition 187;
  the product reads later editions from the database (addendum, Sprint 012).
- **Out of scope:** contacting builders or sales rooms; any runtime LLM feature
  (that would need its own «code first» ADR); scheduled cloud runs of the bandeja (they need a sprint that proves them).

## Addendum — Sprint 012: the edition moves to the database

Migration 15 puts the processed edition in two tables, `ediciones` and `proyectos_nuevos`, and nothing else of the magazine.

- **Same wall, one more door.** The tables carry the same whitelist as decision 3 (typed columns, closed lists, no phone,
  address, web or ad text) and `CHECK`s that reject a web, an email or a phone in the short text columns. Row-level security is
  on with **no policy for the anonymous role**: the anonymous reads through one `security definer` function,
  `nuevos_publicados(date)`, which returns only **published** editions and only whitelisted columns. A direct `select`
  on either table returns nothing.
- **Load is not publish.** The bandeja type `edicion-del-mes` now ends in a database row. `entregar` leaves the validated
  `crudo/edicion-N.json` (job `listo`); `cargar` writes the edition **unpublished** and fixes a review sample of five projects
  (random with a declared seed, by default the edition number); `publicar --revisada` is the `entregado` state and only
  succeeds with that exact sample, so the review belongs to **this** edition. `retirar` takes a published edition down at once
  (the fallback if the publisher objects) and leaves its data for review. The review page `crudo/revision-N.html` shows the five
  rows next to their magazine pages and lives in the ignored folder like the pages themselves.
- **Writes need a decision.** The loader uses the service key from the environment, prints which database it talks to
  (masked) and **refuses a non-local database without `--nube`**; touching the cloud is a deliberate act with the user's «yes».
- **Validity, not freshness by clock.** The function picks the published edition whose window contains the given day (highest
  number if several); if none does it returns the last published one so the product can say «month without an edition» with
  its date, instead of showing stale figures as current.
