# ADR 010 — Founder package served from `public/`

- **Status:** Accepted
- **Decided:** Sprint 003 (minor deviation from the plan) · **Written down:** 2026-10-17 (Sprint 004)
- **Sprint:** 003 / 004

## Context

The founder package is four self-contained HTML guides: a price guide, a photo guide, "get your
CTL in 10 minutes" and a legal/notarial checklist. Domain rule 12 of the pipeline says every
deliverable is a file of the repo. The Sprint 003 plan placed them in `docs/` and copied them to
`public/` at build time, the way the brochure goes from `docs/BROCHURE.html` to `public/conoce.html`
through `build:brochure`.

## Decision

The guides live in `public/paquete-fundador/` and are served statically at
`/paquete-fundador/<name>.html`. The `PaqueteFundador` component links to them from the landing,
the confirmation page and `/mi-anuncio`. There is no copy script.

The brochure keeps its `docs/` home because it is also a document with an export contract
(`docs/brochure-export.json`) and a canonical copy. The guides have no second consumer, so a copy
step would be a moving part with no benefit.

## Consequences

- One source of truth: editing the guide edits what is served.
- No generated file to gitignore or exclude from lint.
- They inherit the global `noindex` and are not in `lighthouse-urls.json`.
- Domain rule 4 still applies: only citable figures (3 % commission, 7–7.5 months, CTL $23.000).
  Sprint 003 checked this with a grep; Sprint 004 repeated it and found no banned figure.
