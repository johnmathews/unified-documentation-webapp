# 260519 — Full-bleed layout decision + doc-page UX fixes

## Context

A batch of four small UI requests against the webapp:

1. The doc page showed the title twice — once in the sticky `.doc-header`
   (`.doc-title`) and again as the first `<h1>` rendered inside
   `.markdown-content`.
2. Breadcrumbs were jammed against the bottom of the blue service-nav band
   with no breathing room.
3. On the `/chat` page the body is full-bleed (`margin: -40px -30px`) but the
   header and service-nav bands capped their contents at a centred
   `max-width: 1100px`, so on wide screens the conversation list started at
   the true left edge while the logo/nav started mid-viewport — visually
   disjointed.
4. The doc reading column (`.doc-layout`) was `max-width: 720px; margin: 0
   auto` — narrow *and* centred, so without the TOC rail its left edge
   floated in the middle of the viewport instead of lining up with the
   service nav.

## Decisions

**1 — Duplicate title.** An `IntersectionObserver` watches the first `<h1>`
inside `.markdown-content`. While that heading is on screen `.doc-title`
gets `display: none`; once it scrolls off the top `.doc-title` reappears in
the sticky header so the title stays pinned. Docs with no leading `<h1>`
keep `.doc-title` visible (nothing to deduplicate). `rootMargin` top
`-100px` makes the swap happen as the real h1 slides under the pinned
header rather than at the raw viewport edge.

**2 — Breadcrumbs.** `Breadcrumbs.svelte`: `margin-top: 15px` →
`padding-top: 15px`. Margin couldn't work on doc pages because the
sticky-header rule zeroes `margin-top`; padding survives that override, so
the crumbs clear the service-nav band on every page.

**3 — Full-bleed header/nav (the load-bearing decision).** The user was
offered two reconciling options and explicitly chose **make the header
full-bleed too** over **cap the chat page to 1100px to match the header**.

- *Chosen:* removed the `max-width: 1100px; margin: 0 auto` cap from
  `.govuk-header__container` and `.govuk-service-nav__container`. Both bands
  now sit at the shared 15/30px inset, edge-to-edge like the chat page —
  every band/column shares one left edge.
- *Rejected:* capping `/chat` to a centred 1100px column. This would have
  been the GOV.UK-faithful choice, but the user values the full-width chat
  area and the consistent shared left edge more than strict adherence here.

**Trade-off, recorded deliberately:** this diverges from the GOV.UK design
system and the prior `webapp/CLAUDE.md` rule ("Max page content width ≈
1020px… Do not let content stretch to fill the viewport"). `CLAUDE.md` has
been updated so this reads as an intentional divergence, not a regression:
the *reading column* stays width-bounded for a comfortable measure, but the
*bands and chrome* are full-bleed and left-aligned by design.

**4 — Doc column.** `.doc-layout` changed from `max-width: 720px; margin: 0
auto` to `max-width: 900px; margin: 0`. Left edge now matches the
service-nav's leftmost item at the 30px inset; the no-TOC column is wider.
`.doc-layout.has-toc` sets no `margin` of its own, so it inherits `margin:
0` and is now left-aligned too — its grid (`minmax(0,720px) 240px`) is
otherwise unchanged.

## Files touched

- `src/routes/doc/[id]/+page.svelte` — IntersectionObserver + `.is-hidden`
  on `.doc-title`; `.doc-layout` width/alignment.
- `src/lib/components/Breadcrumbs.svelte` — margin→padding top.
- `src/routes/+layout.svelte` — dropped the 1100px caps on the two bands.
- `CLAUDE.md` — reframed the width rule as a deliberate divergence.

## Known limitation (recorded in code review)

The duplicate-title fix toggles `.doc-title` with `display: none`, which
changes the sticky `.doc-header`'s height and therefore nudges the observed
in-body `<h1>`. At the exact scroll position where the swap happens, a
stationary scroll can flicker. Accepted as a proportionate trade-off for a
UI-polish change (momentum scrolling passes through cleanly); the code
carries a maintainer note to revisit with dual-threshold hysteresis only if
it proves annoying in practice.

## Verification

- `npm run lint` — clean.
- `npm test` — 325/325 pass; coverage run completed without failures.
- Coverage gap: `src/routes/doc/[id]/+page.svelte` sits at 0% — a
  **pre-existing** untested route (no test file before this session). The
  change there is CSS + a lifecycle IntersectionObserver effect that the
  repo has no render harness to exercise for that route; not a regression.
- **Not** browser-verified: the scroll-toggle and the alignment/width
  visuals are runtime/CSS effects and need the local backend running (no
  mock layer) to check live. Recommend a Playwright/visual pass before
  release.
