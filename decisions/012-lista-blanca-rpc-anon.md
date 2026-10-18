# ADR 012 — RPC allowlist for `anon`: default privileges are not a contract

- **Status:** Accepted · completed by migration 6 in Sprint 005 (see the update at the end)
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

**Production was not exposed.** A read-only look at the catalog of the linked project (before the
migration) showed the older default (`postgres` only) and `anon = no` on `marcar_verificado` and
`generar_link_anuncio`. The exposure existed only on the newer image used by CI and by anyone
running the CLI without the version pins of `supabase/.temp`.

## Decision

Migration `20261017000001_lista_blanca_rpc_anon.sql` (applied to the linked project on 2026-10-17):

1. `anon` executes only an explicit allowlist of 13 public RPCs (the seller flow, the public
   listing, quotas, referral, renewal and the keep-alive). Every other function in `public` that
   the migrating role owns is revoked from `PUBLIC` and `anon`. Event triggers and functions of
   other owners (for example Supabase's own `rls_auto_enable`) are left alone: `postgres` is not a
   superuser and those are managed by the platform.
2. Cron and internal functions (`marcar_vencidos`, `generar_slug`, `tocar_updated_at`) are also
   revoked from `authenticated`.
3. `alter default privileges for role postgres in schema public revoke execute on functions from
public, anon, authenticated` removes the **direct** default grants to `anon` and `authenticated`.

**What step 3 does not do.** An `IN SCHEMA` default is added to the global default, so it cannot
remove the `EXECUTE` that Postgres gives to `PUBLIC` on every new function. Measured with a probe
function on the 17.11 image: a function created after the migration has ACL
`{=X/postgres, postgres=X/postgres, service_role=X/postgres}`, so `anon` and `authenticated` can
still execute it through `PUBLIC`. An earlier draft of this ADR said new functions are born closed;
that was wrong.

**Rule for future migrations:** every new function in `public` starts with
`revoke all on function … from public`, then grants explicitly: `grant execute … to anon,
authenticated` if it is a public RPC, `… to authenticated` if it is an operator RPC, `… to
service_role` if it is cron.

**The safety net is a test, not the rule.** `tests/e2e/permisos-funciones.spec.ts` reads the
catalog of the local database and fails if the set of functions `anon` can execute differs from the
allowlist, so a new function that nobody closed breaks CI. `tests/e2e/rls.spec.ts` keeps a matrix of
closed RPCs that asserts error `42501` (permission denied), not just "there was an error": a function
that runs and fails inside (`inmueble_no_encontrado`) also returns an error and would be a false green.

## Consequences

- The permission no longer changes when the image's defaults change.
- The local stack is pinned to the cloud's versions by `supabase/.temp`, while CI pulls the CLI's
  newer images. Drift between the two is exactly what hid this; the e2e is the guard.
- The allowlist in the migration is a snapshot, not a living list. The living contract is the rule
  above plus the catalog test (which holds its own copy of the allowlist: adding a public RPC means
  editing it on purpose).

## Alternatives considered

- **Close new functions by default with a global default privilege** (no `IN SCHEMA`):
  `alter default privileges for role postgres revoke execute on functions from public`. Measured:
  it works (a probe in `public` and one in `extensions` both come out with `anon = false`). Not
  applied in Sprint 004: it is another production change, and it also strips `PUBLIC` from anything
  `postgres` creates in other schemas, such as a future extension. It is the natural next step and
  needs its own decision.
- **Edit migration 3 in place:** rejected, migrations 1–2 are already in the cloud project and the
  fix must also reach them.
- **Check the role inside every function body:** rejected as the primary defense (it duplicates the
  grant system); it can be added later as depth.
- **Pin the CI images to the cloud's versions:** complementary, not chosen: a new developer gets
  the CLI's current images, so the repo must be safe under both.

## Update — Sprint 005

The alternative left open above ("close new functions by default with a global default privilege") is
now applied. Migration 6 (`20261018000001_funciones_cerradas_por_defecto.sql`) adds
`alter default privileges for role postgres revoke execute on functions from public` and re-asserts the
allowlist **by signature** (it pays the Sprint 004 note that the migration listed names, not
signatures).

Measured on the stack pinned to the cloud's versions (Postgres 17.6) and with the images CI pulls
(17.11):

- A function created after the migration is born with ACL `{postgres, service_role}`: closed to `anon`,
  `authenticated` **and** PUBLIC. The Sprint 004 claim that new functions were born closed was false
  then and is true now.
- None of the 23 functions that `postgres` owns in `public` depends on PUBLIC. The 13 public RPCs already
  had explicit grants, so the re-assertion changes no existing permission for `anon` or `authenticated`.

Applied to the linked project on 2026-10-17, with the user's explicit yes and a read-only look at the
catalog before and after (`supabase migration list --linked`: 7 of 7 aligned). Production, measured:

- Before, `anon` could execute exactly the 13 public RPCs, the 7 operator RPCs were `authenticated` only,
  and no function depended on PUBLIC. After, the same sets: `anon` 13, `authenticated` 20, PUBLIC 0.
- The one real difference from the local stack: in production `service_role` had no EXECUTE on the
  public RPCs, and now has it on the 13 (plus `obtener_lote`, from migration 7). It is the server key,
  which already reads every table, so nothing opens outward.
- The default for `postgres` now has the global entry (no `IN SCHEMA`) `{postgres=X}`, so a function
  created from here on is closed to PUBLIC. Not probed in production (a probe is a write, even rolled
  back); the probe runs on the local stack and in CI.

**New rule for migrations:** a new function is closed. Open it explicitly with
`grant execute … to anon, authenticated` (public RPC) or `… to authenticated` (operator RPC).
`revoke all … from public` is no longer needed, and is harmless.

The catalog test (`tests/e2e/permisos-funciones.spec.ts`) now compares the allowlist **by signature**,
asserts that no function depends on PUBLIC, creates a probe function inside a transaction that is rolled
back and requires it to be closed, and proves the probe fails when the default is opened.

The cost stays as declared: the global default also removes PUBLIC from what `postgres` creates in other
schemas, such as a future extension. The app's functions that use extensions are SECURITY DEFINER and
run as `postgres`.
