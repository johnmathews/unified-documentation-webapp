# 260519 — Source-view headings + journal width & column layout

Four UI requests against `/source/[name]` and `/journal`.

## Changes

1. **Folder section headings now Title-Cased.** `src/routes/source/[name]/+page.svelte`
   and the folder-browse route `src/routes/source/[name]/[...path]/+page.svelte`
   rendered child folder sections as the raw filesystem name (`{child.name}`),
   so `docs`/`journal` showed lowercase. Now `{displaySource(child.name)}` —
   reusing the app's canonical Title-Case helper (acronym-aware: API, CI/CD),
   keeping capitalisation consistent with masthead titles and filter pills.

2. **Root-docs section "Files" → "Root Documents".** On `/source/[name]` the
   `rootDocs` section (docs at the repository root) was hardcoded "Files".
   Renamed to "Root Documents" — the user's definition ("if the document is
   in the root of the project") describes exactly this section.
   **Interpretation note:** the request listed both `Files` (item 1) and a
   `Docs → Root Documents` rename (item 2); read together this means rename
   the project-root section and Title-Case the folder names. The
   `[...path]` sub-folder route keeps its "Files" label deliberately — there
   it means *that folder's* root docs, not the project root, so "Root
   Documents" would mislead.

3. **Journal content width matched to masthead.** `.journal-page` was
   `max-width: 720px` while the masthead inner is `960px` — the 240px
   mismatch made the column look oddly narrow. Aligned to `960px` (the
   source page already used this pattern).

4. **Journal entries → aligned 3-column grid.** `.entry` was a wrapping
   flexbox, so title start position jittered row to row. Now
   `display: grid; grid-template-columns: 3.5em 270px 1fr` (date | source |
   title). Fixed first two columns keep titles aligned across all rows.
   `270px` chosen so real project names ("Unified Documentation Webapp")
   fit without ellipsis; ellipsis kept only as a safety net for pathological
   names. When a project filter is active the source span isn't rendered, so
   `.entry.filtered` drops to a 2-column grid (`3.5em 1fr`). Mobile
   (`max-width: 640px`) stacks to a single column. Date blank-on-repeat
   behaviour is markup-driven and unchanged.

Test assertions in both `source/[name]` route test files updated for the new
labels (`Guides`/`Reference`/`Root Documents`, etc.).

## Verification

- `npm run lint` clean; `npm test` 324/324 pass; `npm run build` succeeds.
- Live Playwright check against a local backend (CLAUDE.md mandate; backend
  run with a temp local-path sources config since the standard local config
  clones 18 remote repos). Confirmed on desktop, project-filtered, and 375px
  mobile; zero console errors.

Branch: `ui-fixes-source-journal`. Webapp-only change — no server side.
