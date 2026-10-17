# ADR 012 — RPC allowlist for `anon`: default privileges are not a contract

- **Status:** Accepted
- **Date:** 2026-10-17
- **Sprint:** 004

## Context

Operator RPCs (`marcar_verificado`, `generar_link_anuncio`, and from migration 3 `fijar_cupo`,
`obtener_lote`, `registrar_envio`, …) were protected only by `revoke … from public` plus
`grant … to authenticated`. Their bodies do not check the role. That works only while the stack's
**default privileges** for new functions do not include `anon`.

Measured on the local stack in Sprint 004, with the same migrations:

| Postgres image                                      | Default function ACL for `postgres` in `public`     | Result                             |
| --------------------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| 17.6.1.147 (the version the linked project reports) | `postgres` only                                     | operator RPCs closed to `anon`     |
| 17.11.0.004 (what the CLI pulls in CI)              | `postgres`, `anon`, `authenticated`, `service_role` | `anon` could execute **every** RPC |

The CI e2e for RLS caught it with `marcar_verificado`. With the open default, an anonymous caller
could rotate the edit token of any listing (`generar_link_anuncio` returns it in clear) and, once
migration 3 was applied, read seller names and emails through `obtener_lote`.

Whether the linked cloud project had the open default was **not measured** when this ADR was
written. The migration below closes it either way.

## Decision

Migration `20261017000001_lista_blanca_rpc_anon.sql`:

1. `anon` executes only an explicit allowlist of 13 public RPCs (the seller flow, the public
   listing, quotas, referral, renewal and the keep-alive). Every other function in `public` is
   revoked from `PUBLIC` and `anon`.
2. Cron and internal functions (`marcar_vencidos`, `generar_slug`, `tocar_updated_at`) are also
   revoked from `authenticated`.
3. `alter default privileges for role postgres in schema public revoke execute on functions from
public, anon, authenticated`: **new functions are born closed**.

**Rule for future migrations:** a function that must be public says so with an explicit
`grant execute … to anon, authenticated`; an operator function grants only `authenticated`; a
cron function only `service_role`. Every new closed function adds its line to the `CERRADAS` list
in `tests/e2e/rls.spec.ts`, which asserts error code `42501` (permission denied), not just "there
was an error": a function that runs and fails inside (`inmueble_no_encontrado`) also returns an
error and would be a false green.

## Consequences

- The permission no longer changes when the image's defaults change.
- The local stack is pinned to the cloud's versions by `supabase/.temp`, while CI pulls the CLI's
  newer images. Drift between the two is exactly what hid this; the e2e is the guard.
- The allowlist in the migration is a snapshot, not a living list. The living contract is the
  rule above plus the `CERRADAS` test.

## Alternatives considered

- **Edit migration 3 in place:** rejected, migrations 1–2 are already in the cloud project and the
  fix must also reach them.
- **Check the role inside every function body:** rejected as the primary defense (it duplicates the
  grant system); it can be added later as depth.
- **Pin the CI images to the cloud's versions:** complementary, not chosen: a new developer gets
  the CLI's current images, so the repo must be safe under both.
