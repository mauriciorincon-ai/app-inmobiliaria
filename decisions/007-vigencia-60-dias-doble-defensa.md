# ADR 007 — Listing validity: 60 days, with a double defense

- **Status:** Accepted
- **Decided:** Sprint 003 (user decision at the start gate) · **Written down:** 2026-10-17 (Sprint 004)
- **Sprint:** 003 / 004

## Context

A listing that was sold or withdrawn but is still shown (a "zombie") destroys trust, and trust is
the whole product in a market hit by fraud. The average sale takes 7–7.5 months, so a validity
that is too short would nag sellers and one that is too long would let zombies live. The seller
has no account (ADR 004), so renewal must be a single click from their magic link.

## Decision

Every property carries `vigente_hasta timestamptz NOT NULL` (default `now() + 60 days`) and
`vigente boolean` (default `true`). Two independent defenses keep zombies out:

1. **On read.** `obtener_ficha` derives validity live: if `vigente_hasta <= now()` the public
   page does not show the listing. It does not wait for any job.
2. **On sweep.** `marcar_vencidos()` (SECURITY DEFINER, `service_role` only) sets
   `vigente = false` on expired rows. `.github/workflows/vigencia.yml` calls it every Monday. The
   sweep feeds the operator panel, the campaign batches (`por-vencer` filter) and the metrics.

**Renewal** is `renovar_vigencia(p_token)`: it sets `vigente_hasta = now() + 60 days` and
`vigente = true` (so it also revives an expired listing). It is a POST. **Nothing mutates on a
GET**, because link previews and email scanners prefetch GETs.

`engine/vigencia` holds the pure date logic (60 days, a 14-day "por vencer" threshold, an
invalid date counts as not valid — fail-safe). The database is the source of truth.

## Consequences

- If the sweep stops, the public never sees a zombie: the failure mode is a stale panel, not a
  stale public page. That is why the defense is double.
- The sweep failed silently for eight weeks because migration 3 never reached the cloud project.
  Sprint 004 answers with an `alerta` issue on any failed scheduled job and with the rule that
  every migration is applied to cloud in the sprint that adds it.
- Applying migration 3 evaluates the column default once, so rows that already existed get
  `now() + 60 days` from the apply date: a one-time grace period for the first founders.

## Alternatives considered

- **Sweep only:** zombies stay visible between runs.
- **Derive on read only:** the panel and batches could not filter by state without recomputing.
