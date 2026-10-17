# ADR 011 — Audit exception for `braces` (GHSA-vfj7-8cjw-p6xm)

- **Status:** Accepted, temporary
- **Date:** 2026-10-17
- **Sprint:** 004

## Context

`pnpm audit --audit-level high` is a blocking CI gate. Rule 18 allows an exception only for an
advisory that has **no patched version**, and only with an ADR. `braces <= 3.0.3` is rated high
(stack exhaustion on deeply nested patterns); the advisory names `>= 3.0.4` as the fix, but the
registry's latest `braces` is 3.0.3 (checked 2026-10-17): the patched version does not exist yet.

Its only path is `eslint-config-next 16.4.2 → @next/eslint-plugin-next → fast-glob 3.3.1 →
micromatch 4.0.8 → braces ^3.0.3`. That is the linter: it runs in development and in CI, never in
the Worker bundle, and the patterns it expands come from the repo's own configuration, not from a
user.

## Decision

Ignore that single advisory in `pnpm-workspace.yaml` (`auditConfig.ignoreGhsas`), with a comment
that points here. `pnpm audit` keeps printing `(1 ignored)`, so the exception stays visible.

## Consequences

- The gate is green with no critical or high advisory open apart from this one.
- **Exit criterion:** remove the ignore as soon as `braces >= 3.0.4` exists or the chain stops
  depending on it. Each sprint opening runs `npm view braces version`.

## Alternatives considered

- **Override `braces` to a fork or an old major:** rejected, it replaces vetted code with
  unvetted code to silence a warning.
- **Drop `eslint-config-next`:** loses the Next lint rules the project relies on.
