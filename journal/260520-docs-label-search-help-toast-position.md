# 260520 — `docs` → Documentation, search-filter help text, toast snug under header

Three small UI polishes off direct user feedback.

## 1. `docs` folder displayed as "Documentation"

The on-disk folder `docs/` was rendered verbatim in three places — file
tree, breadcrumbs, and the source-page directory headings — which read
as terse and code-like in a UI titled "Documentation Library". Added
`displayFolderName` in `src/lib/titles.ts` mapping `docs` (case-
insensitive) to `Documentation`; everything else is returned unchanged
so case-sensitive folder names like `.github` or `run-books` keep their
existing casing.

Applied in:

- `Breadcrumbs.svelte` — folder segment links (href still points at the
  real `/source/.../docs` route; only the visible text changes)
- `TreeNode.svelte` — sidebar folder labels
- `source/[name]/+page.svelte` `groupLabel` — falls back to
  `displaySource` for non-overridden segments, so `docs/archive`
  renders as `Documentation / Archive`

Tests updated for the new labels in `Breadcrumbs.test.ts`,
`TreeNode.test.ts`, and `source/[name]/page.test.ts`.

## 2. Search filter: tooltip + Type dropdown rename

The "Exclude non-documentation files from results" checkbox in the
SearchPanel had no explanation, and the Type dropdown's `Not docs`
option used different wording for the same concept — the user (rightly)
asked whether they referred to the same set. Yes: both map to the
backend's `not-docs` type, which the indexer classifies via the
`not-docs` rules in `document-types.yml` (default: `*.lock` and
`.DS_Store`).

Two changes:

- `DOC_TYPES` entry renamed `Not docs` → `Not documentation` so the
  Type dropdown matches the checkbox copy.
- Added a small `(?)` info icon next to the checkbox label. Hover shows
  a two-paragraph native-tooltip via `title=` that lists the default
  rules and explicitly states the checkbox/dropdown relationship
  ("checkbox HIDES them; dropdown SHOWS ONLY them"). Native `title=`
  matches the existing tooltip pattern in `/+page.svelte` —
  intentionally no custom tooltip component.

## 3. Toast notification snug under the header

The toaster sat at `top: var(--header-height) + 8px; right: 30px`,
which on pages with their own masthead band looked like it was
floating in the page rather than attached to the global chrome.
Tightened to `top: var(--header-height) + 4px; right: 12px` so it
reads as a header-anchored overlay. The user picked this option ("top-
right with small gap") over alternatives "flush attached to header"
and "bottom-right". Mobile (≤640px) keeps the same top offset for
consistency.

## Verification

Local backend (`DOCSERVER_INGEST_ON_START=0 DOCSERVER_POLL_INTERVAL=0`)
+ `npm run dev` + Playwright:

- `/doc/SRE-agent:docs/tool-reference.md` breadcrumb: `Home / SRE
  Agent / Documentation` ✓
- Sidebar Tech Blog tree: `.github / Documentation / journal /
  run-books` ✓
- `/source/tech-blog` groups: `Root Documents`, `.github / Issue
  Template`, `Documentation`, `Journal`, `Run Books` ✓
- SearchPanel: Type dropdown options end with `Not documentation`; the
  checkbox label has a `(?)` info icon whose `title` begins "Hides
  files the indexer classifies as 'Not documentation' …" ✓
- Triggered `Scan now`: toast renders at `top: 127.5px, right: 12px`,
  i.e. 4 px below the resolved `--header-height` (123.5 px) ✓

`npm run lint` clean, `vitest run` 325/325.
