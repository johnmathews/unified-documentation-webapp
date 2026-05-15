# 260515 — Source-badge cross-route fix (closer of round 2)

## What shipped

The "source-badge underline pattern" cross-route fix that was flagged in every
round-2 PR (rounds 1–8) without being resolved. Three CSS deletions, 13 lines
total, no template changes.

| File | Change |
|------|--------|
| `src/routes/doc/[id]/+page.svelte` | `.source-badge` — drop `text-decoration: none`, `transition: opacity 0.15s`, and `.source-badge:hover { opacity: 0.8 }`. Global `a {}` rule now provides underline + visited + 3px hover thickening + GOV.UK focus. |
| `src/routes/status/+page.svelte` | `.source-link` — drop `text-decoration: none`, `color: inherit`, and the `.source-link:hover .source-tag { text-decoration: underline }` workaround. Global rule provides the same as above. `min-height: 44px` touch floor preserved. |
| `src/lib/components/ChatPanel.svelte` | `.history-title` — drop `color: var(--link)`. The title is a `<span>` inside a clickable row, not a link itself; the link-blue colour was a misleading affordance. |

## The decision behind the decision

The original framing — "fix the source-badge pattern on eight surfaces" — implied
either (a) drop `text-decoration: none` overrides everywhere or (b) introduce a
global `.source-badge` utility class. Reconnaissance flipped that framing.

Only **two surfaces** actually have GOV.UK violations: `/doc/[id]` and `/status`.
Both wrap source names in real `<a>` elements with `text-decoration: none`
overrides. Both became correct simply by deleting the overrides — no template
change, no new utility class, no per-surface decision.

The other five surfaces (`/journal`, `/bookmarks` `<h2>`, SearchPanel `.source-tag`,
ChatPanel `.history-title`, `/source/[name]` masthead) are already plain
non-link labels. Five consecutive round-2 PRs all reached "leave neutral so the
cross-route round decides," and the cross-route round agreed: **non-link labels
shouldn't look like links.** None of those five surfaces became anchors. The
right consistency model is "every source-name that is a link is styled like
a link (GOV.UK underline); every source-name that isn't a link is plain text."

ChatPanel `.history-title` was the only outlier — a `<span>` that was styled
link-blue but isn't itself a link (the parent `.history-item` row is the click
target). The link-blue colour was removed; the row-click pattern stays. The
nested-interactive accessibility question (whether `.history-title` should be a
real `<a>` and the row-click handler dropped) is deferred to a future
accessibility round.

## Verification

- 1440×1024 + 375×812, light + dark theme, Playwright.
- `/doc/[id]` `.source-badge`: `rgb(26,101,166)` light / `#5694ca` dark, underline, 44px touch on mobile.
- `/status` `.source-link`: same.
- Five neutral surfaces: plain text, no underline, no link colour. Unchanged.
- 0 console errors across all viewports/themes.
- `npm test`: 254 passed (15 files) — no regression, no increase.
- `npm run check`: clean.
- `npm run lint`: clean.

## Out of scope

1. **No global `.source-badge` utility class.** Only two surfaces use the
   anchor pattern, and the global `a {}` rule covers them. A bespoke class
   would add ceremony without adding clarity.
2. **No source links on the five neutral surfaces.** Five rounds of
   round-2 reasoning held: a second link target on a row that already has a
   primary link (e.g. doc title) competes for the eye, and "source = grouping
   key" is implicit on `/journal` and `/bookmarks`. Don't relitigate.
3. **No ChatPanel row-click refactor.** Removing the link-blue colour is
   sufficient to fix the misleading-affordance issue. The nested-interactive
   question (row vs. title as the click target) is its own concern and belongs
   in an accessibility round.
4. **No `/source/[name]` masthead changes.** The `<h1>` is the page heading,
   not a source label that masquerades as a link.

## Follow-ups

After this round closes, two strands remain visible from the eight rounds of
round-2 work:

1. **Backend follow-ups flagged in multiple rounds:** `/api/bookmarks` missing
   `type` field; doc-type classifier not running in the ingestion subprocess.
   Both live in `server/`, both are independent of UI work.
2. **Round 3 scope is open.** Possible candidates: a11y sweep (would resolve
   the ChatPanel row-click question and the focus-visible audit), or an
   information-density pass on `/status` and the home page.
