# Evaluation: /source/[name] layout disconnect

## Executive summary

On `/source/relay` (and all `/source/[name]` pages), the folder rows in the
tree visually disconnect the folder name (left edge) from its doc count (far
right edge). At ≥960px viewport the gap between a 6-character name and a
single-digit count exceeds 700px of empty space, breaking the user's ability
to associate label with value. Root cause is one CSS rule in
`TreeNode.svelte`; secondary contributor is the page's 960px max-width
which is wider than GOV.UK's two-thirds (≈680px) content recommendation.
Scope per user: fix this view only; broader UI audit deferred.

## Test suite (baseline)

Not re-run for a single-symptom layout fix. The existing vitest suite passes
on `main` (see CI). Will run full suite + lint + type-check before commit.

## Root cause

`src/lib/components/TreeNode.svelte:130` — `.folder-name { flex: 1 }`.

The `.folder-toggle` row is `display: flex; width: 100%`. Giving `.folder-name`
`flex: 1` makes it absorb all spare horizontal space, which pushes the
adjacent `.count` element against the row's right edge. In the 320px sidebar
this is acceptable (gap is small, behaves like a list aligned to the panel
edge). On the 960px source page the gap dominates the row and the count
reads as a separate column rather than as a label suffix.

Confirmed **[VERIFIED]** by reading the CSS and the screenshots the user
shared. Leaf rows (`.tree-leaf` / `.leaf-title`) are not affected —
`.leaf-title` uses default `flex: 0 1 auto` and already sits tight against
the file icon.

## Why this is a regression from the design principles

`docs/govuk-design-research.md` — the project's north star — calls out:

- §5 Layout: "Content does not stretch to fill the screen"; default page
  max-width 1020px; two-thirds column (≈680px) recommended for content.
- §12 Visual hierarchy: borders and alignment direct scanning; key/value
  pairs should remain visually associated (Summary List pattern).
- Brutalist tenet 6 (§10): every visual element must solve a specific
  problem. A 700px gap between label and value is decoration-by-accident
  with negative information value.

## Findings

1. **[VERIFIED]** `TreeNode.svelte:130` — `.folder-name { flex: 1 }` is the
   direct cause of the disconnect.
2. **[VERIFIED]** `src/routes/source/[name]/+page.svelte:127` —
   `.source-page { max-width: 960px }` is wider than GOV.UK two-thirds; even
   after fixing (1) the page reads as too wide on desktop.
3. **[VERIFIED]** `webapp/CLAUDE.md` does not mention the north-star docs
   (`docs/govuk-design-research.md`, `docs/brutalist-ui-implementation-plan.md`).
   Future agents working on the webapp won't discover them by default →
   continued drift from the design principles.

## Out of scope (per user)

Broader UI audit of other routes (`/`, `/doc/[id]`, `/journal`, search, chat,
`/bookmarks`, `/status`). User said "we will get to them later." Findings 1-3
above are the only items in this round.

## Hygiene note (not in scope)

`.engineering-team/` contains five files from previous sessions checked into
git. The engineering-team skill treats this directory as session-local
working storage; persisting it in the repo accumulates stale planning
artifacts. Not addressed this round — flagged for a future hygiene pass.
