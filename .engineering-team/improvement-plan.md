---
plan: source-view-layout
units:
  - id: W1
    title: Make design north-star docs discoverable from webapp CLAUDE.md
  - id: W2
    title: Fix TreeNode folder row — tightly couple name and count
  - id: W3
    title: Narrow /source/[name] content column toward GOV.UK two-thirds
  - id: W4
    title: Visual verification across phone / tablet / desktop / wide
---

## Non-goals

- No audit or fixes for other routes (home, doc viewer, journal, search,
  chat, bookmarks, status) — user explicitly said "we will get to them later".
- No changes to TreeNode behaviour in the sidebar — fixes must not regress
  the 320px-wide sidebar rendering.
- No changes to backend, API contracts, or doc-tree data shape.
- No new design tokens or refactor of `app.css`; reuse what's there.

## Ordering rationale

W1 first (zero-risk, makes principles discoverable for the rest of this
work). W2 before W3 because the count-disconnect bug is the user's primary
complaint and W3 only refines what W2 already fixes. W4 last — verifies the
two CSS changes across viewports.

## Work units

### W1 — Make design north-star docs discoverable from webapp CLAUDE.md

- **Priority:** High
- **Risk:** Low — pure docs.
- **Size:** S
- **Changes:** Add a "Design principles" section to `webapp/CLAUDE.md`
  linking to `docs/govuk-design-research.md` (north star — default to it,
  deviate only with a stated reason) and `docs/brutalist-ui-implementation-plan.md`
  (companion / implementation context).
- **Test impact:** None.
- **Reversibility:** Revert the commit.
- **Dependencies:** None.
- **Acceptance criteria:** `webapp/CLAUDE.md` contains a "Design principles"
  section near the top with both doc links, with `govuk-design-research.md`
  explicitly labelled as the default / north star.

### W2 — Fix TreeNode folder row — tightly couple name and count

- **Priority:** Critical (this is the visible bug).
- **Risk:** Medium — TreeNode is rendered in both the sidebar (320px) and
  the source page (960px now, narrower after W3). A regression in either is
  user-visible.
- **Size:** S
- **Changes:** `src/lib/components/TreeNode.svelte`
  - `.folder-name`: drop `flex: 1`; add `min-width: 0` so name shrinks but
    does not grow. Keep `overflow: hidden / text-overflow: ellipsis /
    white-space: nowrap` so long names still ellipsis.
  - `.count`: add `flex-shrink: 0` so the count never collapses or
    line-breaks when names are long.
  - Keep `.folder-toggle { width: 100% }` so the hover background still
    covers the full row width.
- **Test impact:** `src/lib/components/TreeNode.test.ts` — read first; the
  existing tests are likely behavioural (toggle / render) and should not
  depend on `flex: 1`. If a test asserts a specific computed style, update.
- **Reversibility:** Revert the commit (pure CSS).
- **Dependencies:** None.
- **Acceptance criteria:** On `/source/relay`, the doc count for each
  folder row sits immediately to the right of the folder name (≤8px gap),
  with remaining row width as empty space to the right. In the 320px
  sidebar, name and count still fit on a single line and ellipsis still
  works on long names. Hover background still spans the full row width.

### W3 — Narrow /source/[name] content column toward GOV.UK two-thirds

- **Priority:** High
- **Risk:** Low — single max-width rule on one page component.
- **Size:** S
- **Changes:** `src/routes/source/[name]/+page.svelte`
  - `.source-page { max-width: 960px }` → `max-width: 720px`. 720px is in
    the spirit of GOV.UK two-thirds (≈680px) with a small allowance for the
    `.controls-row` (stats + expand/collapse + sort toggle) which is wider
    than pure prose. The existing 640px mobile breakpoint that stacks the
    controls-row remains untouched.
- **Test impact:** None.
- **Reversibility:** Revert the commit.
- **Dependencies:** W2 should be in place when verifying this — they
  compound visually.
- **Acceptance criteria:** On a 1440px desktop, the source page content
  sits in a ~720px column centred horizontally with whitespace on both
  sides. On a 768px tablet, the page uses available width up to 720px (no
  horizontal scroll). On a 375px phone, the page fits with no horizontal
  scroll and the controls-row stacks (existing behaviour).

### W4 — Visual verification across phone / tablet / desktop / wide

- **Priority:** High
- **Risk:** Low — verification only.
- **Size:** S
- **Changes:** None to source. Output: screenshots stored under
  `.engineering-team/screenshots/` for the journal entry to reference.
- **Test impact:** None.
- **Reversibility:** N/A.
- **Dependencies:** W2 + W3 complete.
- **Acceptance criteria:** Screenshots at 375 / 768 / 1024 / 1440px on
  `/source/relay` in light mode, plus one dark-mode shot. Confirm: (a)
  folder name + count are visually coupled at every width, (b) page never
  produces horizontal scroll, (c) controls-row layout is sensible at each
  width, (d) sidebar count rendering is unaffected (a before/after of the
  sidebar at 1440px is enough).
