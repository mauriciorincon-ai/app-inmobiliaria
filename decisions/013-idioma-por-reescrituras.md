# ADR 013 — Language by rewrites, not by a proxy; a dictionary without a library

- **Status:** Accepted
- **Date:** 2026-10-17
- **Sprint:** 005

## Context

Innmobiliaria was monolingual (Spanish) and Sprint 005 makes the whole app bilingual (ES/EN), for
Colombians living abroad and foreigners who buy or rent in Bogotá. Three constraints shape how:

- **Public URLs cannot change.** Listing pages (`/i/<slug>`) already circulate by WhatsApp.
- **Pages must stay static.** Reading a cookie while rendering makes a page dynamic and breaks the
  static LCP of the landing (product rule 6).
- **Cloudflare Workers via OpenNext** (ADR 001) is the runtime.

The Sprint 005 technical plan proposed a `src/proxy.ts` that reads the language and rewrites to an
internal `[lang]` segment.

## Decision

**1. The language is resolved by `rewrites.afterFiles` in `next.config.ts`, with no proxy.** Each
request is rewritten to an internal `/es/...` or `/en/...` segment that is prerendered
(`generateStaticParams` in `app/[lang]/layout.tsx`, which is also the root layout and sets
`<html lang="es-CO" | "en">`). First match wins:

1. cookie `idioma=en` → `/en`
2. cookie `idioma=es` → `/es`
3. no valid cookie and an `Accept-Language` that does not start with `es` but accepts `en` → `/en`
4. everything else → `/es` (the market is Bogotá)

`/conoce` goes first and files in `public/` and `api/` are resolved before `afterFiles`, so they are
never rewritten. A direct request to `/en/x` becomes `/en/en/x`, matches no route and is a 404:
internal segments are not exposed.

**Why not `proxy.ts`.** In Next 16 the proxy always runs on Node, and OpenNext warns at build time
that Node middleware on Cloudflare is _«experimental … not officially maintained»_. Rewrites with
`has` conditions are implemented the same way by Next's router and by OpenNext's own routing layer
(`matcher.js`, `routingHandler.js`; both anchor the pattern as `^…$`), so the plan's effect (same URL,
static pages) is reached on the supported path. This is a declared deviation from the technical plan.

**2. A dictionary without a library.** Texts live in `src/textos/<area>.ts` as trees of `{ es, en }`
leaves (the `Arbol` type forces both languages at compile time). `enIdioma(tree, lang)` projects a tree
to one language; client components receive only the projected subtree through props, so the other
language never reaches the browser. Pages read `params.lang`; `loading.tsx` and `not-found.tsx`,
which Next does not feed with `params`, use `next/root-params`. English is **written, not translated**.

**3. Two guards** (product rule 10): `tests/unit/textos-paridad.test.ts` (both languages present,
non-empty, not a copy, same `{placeholders}`) and `tests/unit/sin-literales.test.ts` (no visible
literal in JSX, visible attributes, `export const metadata`, data arrays, Zod messages or engine
phrases). Both are proven failing with bad fixtures.

**4. The selector** (`SelectorIdioma`) writes the cookie `idioma` (1 year, `SameSite=Lax`) and
**reloads**. A reload keeps the `#t=` fragment of `/mi-anuncio` and `/renovar`; a server redirect
would lose it.

**5. The 404.** Next renders its root `not-found` outside the `[lang]` layout, because the root layout
lives in a dynamic segment (`global-not-found` is still experimental). `app/not-found.tsx` therefore
shows both languages at once, each block with its own `lang`. It is the only document of the app
without `<html lang>`.

## Measured (Sprint 005, F1)

The rewrite matrix (cookie, `Accept-Language`, query, public files, API, internal segments, 404) ran
against both `next start` and the local Workers runtime (`opennextjs-cloudflare preview`):

- All language-resolution cases pass on both, including an invalid cookie falling back to the header.
- `/conoce.html` and `/paquete-fundador/<x>.html` answer **307** to the extensionless URL on Workers:
  that is Cloudflare Assets' default `html_handling`, not our rewrites. Both end in 200 and the
  extensionless guides are served as files with any cookie.
- Lighthouse carries the cookie through `collect.settings.extraHeaders` (verified by screenshot).

## Consequences

- Any cache in front of the Worker must vary on `Cookie` and `Accept-Language`. There is none today.
- There are no `hreflang` alternates: the whole site is `noindex` until H-4, when this is revisited.
- CI covers the rewrites on Next's router (`tests/e2e/idioma.spec.ts`); the Workers runtime was checked
  by hand in F1 and is not a CI job.
- Not measured: client-side navigation through `<Link>` prefetch with the cookie set (the e2e switches
  language and navigates with full loads).
- Not measured: the language of link previews. The crawler that builds the preview when a listing link
  is pasted into WhatsApp sends no cookie, so rule 3 decides on its `Accept-Language`; if that header
  asks for English the preview may come out in English («COP 420,000,000») for a Spanish-speaking
  chat. Check with a real paste after the first deploy (guide test G1); the fix, if needed, is a
  `missing` condition on the crawler's `user-agent` in the English-by-header rule.
- A browser sending `fr,es;q=0.8,en;q=0.5` gets English: rule 3 only asks that the header does not
  _start_ with `es` and contains `en`, not that English outranks Spanish.

## Alternatives considered

- **`proxy.ts` + `[lang]` rewrite** (the plan): works on Node, experimental on Cloudflare.
- **Language in the path** (`/en/...`): breaks every shared link and changes the public URLs.
- **Reading the cookie in a Server Component**: makes every page dynamic and loses the static LCP.
- **A library (`next-intl` and similar):** not needed for two languages and static pages; more moving
  parts on a runtime that is already tight.
