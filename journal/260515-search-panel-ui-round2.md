# 2026-05-15 — Search panel restyled to GOV.UK standards (round 2, route 6)

Round-2 follow-up to the `/bookmarks` restyle (`bbfc28b`). Sixth UI-
standards unit in the round-2 sweep, and the first that targets a
**panel** (drawer) rather than a route. The 720 px reading-column rule
from rounds 2 W1-W5 does not apply — this surface is a fixed-position
drawer with its own width budget (250–800 px, default 320 px, 384 px
on large screens, full-width on mobile).

CSS-only change to one file:
`src/lib/components/SearchPanel.svelte`.

## What changed

1. **Universal 44 px touch floor.** Moved `min-height: 44px` (and the
   corresponding width fix on `.search-button`) out of the
   `@media (max-width: 768px)` block and onto the base rules for
   `.search-input`, `.search-button`, `.filter-select`,
   `.filter-toggle`, `.date-input`, `.exclude-toggle`, and
   `.clear-filters-btn`. Matches the universal-floor rule established
   in rounds 4 and 5: a 44 px tap target is no more expensive on
   desktop than on mobile, and asymmetric floors create reachability
   gaps on touch-enabled laptops.
2. **Result title → GOV.UK body (19 / 25).** Bumped `.result-title`
   from 16 / 21.6 to 19 / 25. The title is the primary anchor and tap
   target of each result row, and was the only one of the three
   list-surface titles (`/journal`, `/bookmarks`, search) that wasn't
   already at GOV.UK body. Same blue, same underline (both inherit
   from the global `a` rule in `app.css`).
3. **Snippet → 2-line clamp, 16 / 20.** Removed the
   `white-space: nowrap; text-overflow: ellipsis` truncation and
   replaced with `display: -webkit-box; -webkit-line-clamp: 2`. At the
   default 320 px panel width the snippet now shows ≈ 70–90 characters
   of the 200-character backend snippet on two lines, vs. the previous
   single-line ≈ 45 characters. The biggest functional improvement in
   the round: snippets were visually present but informationally
   absent. Stayed at 2 lines, not 3 — three pushes row height past the
   "scannable list" budget at the narrow default width.
4. **Exclude-toggle bumped to a real control.** `.exclude-toggle`
   went from 13 / 17.55 to 16 / 20, gained a 44 px `min-height`, and
   the box-to-label gap widened from 6 to 10 px. It toggles a
   server-side `exclude_types=not-docs` filter — a primary control,
   not a footnote, and was rendered below the project's minimum body
   floor.
5. **5 px line-height grid everywhere.** Eight elements had fractional
   pixel line-heights inherited from `*1.35`, `*1.2`, `*1.3`
   ratios — `21.6`, `18.9`, `17.55`, `16.2`. Replaced with explicit
   `line-height: 20px` (or 25 px on the result title). Fixed
   elements: `.filter-group-legend`, `.filter-hint`, `.filter-toggle`,
   `.filter-select`, `.search-input`, `.search-msg`, `.results-count`,
   `.exclude-toggle`, `.date-row-label`, `.date-input-label`,
   `.date-input`, `.clear-filters-btn`, `.result-date`,
   `.result-snippet`, `.source-tag` (inside `.result-meta`).
6. **Date-row spacing nudge.** `.date-row-label` bumped from 14 → 16,
   width 45 → 50 (so "Before" doesn't wrap on dark mode bold), and
   `padding-bottom: 8 → 12` so the label baselines with the input
   text rather than the input top.
7. **Mobile @media block reduced** from 8 rules to 2: `.search-label`
   16 / 20 (heading-s drop on mobile, mirrors round-2 conventions)
   and `.result-item` 15 px padding. Everything else moved to the
   base rules as universal floors.

## Design choices that matter

1. **720 px rule does not apply; 5 px grid + 44 px floor + global
   `a` rule do.** Cross-cutting rules apply to every surface; column-
   width rules apply to long-form reading surfaces. The search panel
   is a control surface in a narrow drawer (250–800 px). The
   round-2 prompt's open question — "do the 720 px / 5-px-line-height
   rules apply directly?" — resolved cleanly: the line-height rule
   yes, the column-width rule no.
2. **Result-row stack, not row-shape.** `/journal` and `/bookmarks`
   moved to a `[date | source | title]` row shape at 720 px. The
   search panel keeps the vertical stack (`title` / `meta` /
   `snippet`) because a 320 px column doesn't have room for the row
   shape. The label/value-adjacency rule from rounds 4-5 applies to
   flat row-shape lists; a vertical card already has its meta
   adjacent to its anchor by construction.
3. **Snippet 2-line clamp, not 3.** Three lines would show more
   context but also push each result row to ≈ 175 px tall at default
   width, halving the list-density. Two is the right floor — enough
   to see the matched term in context, not enough to dominate the
   panel.
4. **`<mark>` highlighting is out of scope.** The backend
   (`server/src/docserver/knowledge_base.py:1099`) returns
   `str(chunk["content"])[:200]` — plain text, no `<mark>` tags. The
   prompt flagged the rendering side as a possible concern; it isn't,
   because there's nothing to render. Wiring server-side
   highlight-emit + a safe-HTML render path is a separate round.
5. **Date-input-label kept at 14 px, not 16.** GOV.UK uses 14 for
   hint-style labels next to grouped inputs ("Day", "Month",
   "Year") — the input is the affordance, the label is the
   reminder. Bumping to 16 would force the date-row to wrap
   awkwardly in the 320 px default panel.
6. **`.result-item` got no explicit `min-height: 44px`.** Title at
   19 / 25 + meta-row + 2-line snippet already produces 120 px+ rows
   at every viewport. Adding a 44 px floor would be redundant. The
   rule is "every interactive element ≥ 44 px"; the result row is
   itself an `<a>`, but it's content-driven well past the floor.

## What I considered and rejected

1. **Linking the source label (`.source-tag`) to `/source/{name}`.**
   Same cross-route source-badge pattern flagged for three rounds
   running. The search panel currently renders it as a plain bold
   `<span>`, so this round neither introduces nor entrenches the
   pattern.
2. **Adding a third snippet line.** Considered for desktop only via
   `@media (min-width: 1024px) { -webkit-line-clamp: 3; }`. Rejected
   because the panel's width is independent of viewport — a user on
   a 1440 px screen with a 250 px panel would still see truncation,
   and a user on a 768 px viewport with a 800 px panel… wait, that's
   impossible (panel clamps to 800 max). Still, the rule "snippet
   length depends on panel width, not viewport width" pointed at a
   container query, which is a sharper edge than the round wanted to
   carry. Two lines at every panel width is the simpler invariant.
3. **GOV.UK checkbox component for the exclude-toggle.** The full
   pattern is `<input>` + visually-hidden, with a custom box drawn
   via CSS pseudo-elements, focus ring outside the box, checkmark
   via mask. Cosmetic improvement only — the current native
   `accent-color: var(--accent)` checkbox is already accessible.
   Out of scope for a CSS-only round.
4. **Reducing the @media block to zero rules.** Tempting (rounds
   4-5 hinted at "universal everywhere"), but `.search-label`
   genuinely benefits from 16 px on a 375 px phone (the H is
   shouting at body size at full panel width), and `.result-item`
   benefits from the 3 px vertical padding bump on touch surfaces.
   Two mobile rules is the right minimum.

## Verification

Playwright at 1440 / 1024 / 768 / 375 px in light + dark mode.
Screenshots in `.engineering-team/after-*.png` (before-shots in
`.engineering-team/before-*.png` for diff). Specifically:

- **At 1440 px light, panel width 384 px:** computed
  `.result-title` is 19 / 25 with `color: rgb(26, 101, 166)` (GOV.UK
  link blue) and `text-decoration-line: underline`. Every interactive
  element (`.search-input`, `.search-button`, `.filter-select`,
  `.filter-toggle`, `.date-input`, `.exclude-toggle`) has
  `min-height: 44px`. Every body-shape text element has a line-height
  that is `20px`, `25px`, or `normal` (the SVG-only `.search-button`).
- **At 375 px:** panel 375 px wide, `.result-title` still 19 / 25,
  `.result-snippet` 16 / 20 wrapping to ≈ 40 px tall (two lines).
  `.result-item` height ≈ 154 px, well above 44 px floor. No
  horizontal overflow (`documentElement.scrollWidth === 375`).
  `.search-label` drops to 16 / 20 via the mobile @media block.
- **At 768 px:** panel becomes full-width (768), all floors firing
  from base rules. `.search-label` 16 / 20.
- **Dark mode at 1440 px:** result-title still GOV.UK link blue
  (`rgb(86, 148, 202)` after dark-mode mapping), borders subtle,
  focus outline GOV.UK yellow.
- **0 console errors** at every viewport in either theme.

Backend booted locally via
`uv run python -m docserver` from `server/` with
`DOCSERVER_CONFIG=.engineering-team/sources.eng.yaml`,
`DOCSERVER_DOC_TYPES_CONFIG=.engineering-team/doc_types.eng.yaml`,
`DOCSERVER_DATA_DIR=local-data-eng`. Verified the type filter wiring
end-to-end: `/api/search?q=docker&type=journal` returns only journal
entries, confirming that the round-5 bookmarks-API `type`-missing bug
is independent of the search endpoint (search results include the
`type` field; bookmarks don't because of an enrichment join, not a
classifier gap).

`npm run check` → 0 errors, 0 warnings, 431 files.
`npm test` → 15 files, 254 tests, all pass.
`npm run lint` → clean.

## Out of scope (flagged for next rounds)

1. Chat panel UI standards round (next).
2. `/status` UI standards round (last remaining route).
3. Source-badge underline pattern across home / source / doc / journal —
   still cross-route, still pending. The search panel renders
   `.source-tag` as a `<span>`, so this round didn't add or commit
   to the pattern.
4. Backend `<mark>` highlighting in search snippets — server-repo
   change; would require an XSS-safe render path on the webapp side
   too. Not urgent.
5. Backend bookmarks-API missing `type` field (round-5 finding) —
   server-repo follow-up batch.

## Design principles this reinforces

1. **Cross-cutting rules apply everywhere; column-width rules apply
   to long-form surfaces.** The 5 px line-height grid, the 44 px
   touch floor, GOV.UK body scale on body-shape text, and the global
   `a` rule are universal. The 720 px reading-column rule and the
   row-shape `[date | source | title]` pattern are specific to
   long-form list routes. Conflating the two would have led to a
   720 px max-width on a 320 px drawer — visually unchanged at
   default width, but breaking the drawer's resize budget.
2. **A primary control should not be rendered as a footnote.** The
   "exclude non-documentation files" toggle was a 13 px label
   alongside a default checkbox — both visually and ergonomically
   below the project's body floor. It maps to a server-side filter
   and changes the entire result set. Bumping it to GOV.UK body at
   the universal touch floor is the simplest fix; the GOV.UK
   custom-checkbox pattern can come later if needed.
3. **A snippet that shows 45 of 200 characters is worse than no
   snippet.** Single-line ellipsis truncation gives the user the
   illusion of context without the substance. Two lines of wrapping
   shows ≈ 90 chars and lets the matched term sit in a real
   sentence. The cost — taller rows — is bounded; the value is
   load-bearing for "is this the result I want?"
