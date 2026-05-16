# 2026-05-16 — Round 3 closer

Round 3 closes the round-2 deferred-items ledger. 14 items across 5 batches,
each landing on its own feature branch and merging to `main` with a
`--no-ff` merge commit. Round-3 spec at
`docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md`.

## What shipped

| Batch | Merge SHA  | Items | Theme |
|-------|------------|-------|-------|
| E     | `4a45232`  | 2     | Polish — ACRONYMS, home masthead breakpoint |
| A     | `a280d21`  | 5     | Accessibility — focus, aria, touch-targets |
| D     | `2085a62`  | 1     | XSS hardening — DOMPurify across both `{@html}` paths |
| C     | `04d0641`  | 2     | State — `/status` sort URL + visibility-paused polling |
| B     | `25c9bf8`  | 3     | Density — `/status`, home, doc viewer |

### Items, in execution order

**E1.** `displaySource` ACRONYMS now includes `md`. `claude-md-global`
renders as `Claude MD Global` everywhere.

**E2.** Home masthead negative-margin breakpoint aligned to the
layout's 768px (was 640px). Closed a silent 15px-each-side overshoot
between 641–767px that `overflow-x: hidden` had been clipping.

**A1.** ChatPanel history rows are real `<button>` elements wrapped in a
flex parent (sibling delete button), replacing `<div role="button">`
with nested button. Keyboard nav now stops on each row; screen readers
announce the title; delete has a real `aria-label`.

**A2.** Focus-state audit — `app.css` documents two canonical patterns
(GOV.UK yellow-fill for `a:focus`, 3px outline for `:focus-visible`).
4 duplicate per-component rules removed; 13 refinements/divergences
kept with inline comments naming the canonical they complement.

**A3.** `/status` badges carry `aria-describedby` pointing at a
visually-hidden `<dl>` of status meanings. WCAG 1.4.1 satisfied (colour
+ programmatic description, not colour alone).

**A4.** ChatPanel `.messages` is an `aria-live="polite"` region —
assistant replies and tool-progress steps are announced as they're
appended.

**A5.** FloatingDocControls `.control-btn` 30 → 44px (WCAG touch
floor).

**D1.** `isomorphic-dompurify` installed; new `src/lib/sanitise.ts`
module wraps both `{@html}` render paths (ChatPanel assistant messages
via `renderMarkdown`; `/doc/[id]` body via `renderMarkdownWithLinks`).
16 unit tests cover strip + preserve + idempotence. Defence-in-depth
double-wrap on the ChatPanel link-rewrite path is intentional.

**C1.** `/status` sort state lives in URL search params. `?sort=…&dir=…`
restored on reload. Unknown values fall back to defaults. Pure helpers
extracted to `page-logic.ts` with 12 unit tests.

**C2.** `/status` polls source health every 30s while the tab is
visible. `visibilitychange` pauses polling on hidden; resumes with an
immediate catch-up fetch on visible. `browser`-gated for SSR.

**B1.** `/status` table tightened to 10/16 padding; subtle zebra
striping via new `--bg-zebra` token. Masthead breakpoint 641/640 →
768/767, mirroring E2.

**B2.** Home page orphan status badge replaced with a one-line summary
bar: `<status badge> · N projects · N documents · last scan Xm ago`.
Whole bar links to `/status`. Table padding tightened to match B1.

**B3.** Doc-viewer header collapsed to a single-line metadata bar at
≥640px: `🔖 source / path · type · modified · words`. New
`--measure: 75ch` token caps body prose. `doc.type` field surfaced for
the first time on the viewer.

## Test surface

282 tests across 17 files (was 254 across 15 at round-2 baseline). +28
new tests:

- 2 — `displaySource` ACRONYMS cases.
- 16 — `sanitise.test.ts` allowlist + strip + idempotence.
- 12 — `page-logic.test.ts` sort-URL roundtrip + polling interval.

`npm run check`, `npm run lint`, `npm run build` all clean on `main`
after every merge.

## Round-4 candidates

Items the round-2 ledger flagged that did **not** ship in round 3:

1. **B4** — Tablet TOC drawer for 768–1023 px on the doc viewer. New
   component, not a layout tweak. Deferred during round-3 brainstorm.

2. **B5** — `/status` expanded ↔ collapsed disclosure for "last error"
   detail. Currently in `title=` tooltip; expandable disclosure is a
   new UI pattern. Deferred during round-3 brainstorm.

3. **Backend `<mark>` highlighting in search snippets.** Cross-repo
   (server emits `<mark>`, webapp renders it). Sanitiser allowlist
   already permits `<mark>` so the webapp side is ready.

4. **ChatPanel streaming cursor / retry button styling.** Depends on a
   streaming chat endpoint that doesn't exist today. Deferred until
   the backend ships streaming.

Surfaced during round-3 execution but not flagged in the spec:

5. **CSP headers.** Sanitiser is in-app defence; a real
   Content-Security-Policy header (delivered by the SvelteKit Node
   server) would add a second layer.

6. **`created_at` and line count on doc viewer.** B3 dropped both
   from the visible metadata bar to keep it compact. If they turn out
   to be missed, restore as a `<details>` "More info" disclosure.

## Closing note

The spec's ordering — E → A → D → B → C — held up well in practice.
Batch E's masthead-breakpoint fix established the pattern that B1
mirrored on `/status`; A's canonical focus comment block in `app.css`
let the audit be a removal/document pass rather than a re-define;
D's sanitiser allowlist quietly enabled future highlight support
without a follow-up spec change; B's mockup pass in the visual
companion meant the CSS PRs landed without back-and-forth on values.

Round 4's scope is open. The most coherent themes available: an a11y
sweep (round 3 hit five items but didn't take a position on a full
WCAG audit), a small-feature round (B4/B5 + restored doc metadata), or
a cross-repo `<mark>` highlight pass with the server team.
