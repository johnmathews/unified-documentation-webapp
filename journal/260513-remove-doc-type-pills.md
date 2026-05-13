# 260513 — Remove document-type pills

## Why

The doc-type pill UI was visually noisy and never quite right:

- The colored row at the top of `/source/[name]` and the sidebar (Documentation / Journal / Prompt / Not docs) gave per-type filtering nobody used much, and the colors competed with everything else on the page.
- The secondary gray row (Bookmarks / Engineering team / Learning journal / Dev journal / Root docs) was a parallel path-based classifier that overlapped conceptually with the folder tree below it.
- The inline "documentation" badges next to every filename in the tree added clutter without changing what the user could do.

The complexity wasn't paying for itself. Ripped the lot out.

## What's gone

UI:

- Top pill rows in `src/lib/components/Sidebar.svelte` and `src/routes/source/[name]/+page.svelte`.
- Inline `<TypeBadge>` next to filenames in `TreeNode.svelte`, in search results in `SearchPanel.svelte`, and on the doc detail page `/doc/[id]/+page.svelte`.
- `src/lib/components/TypeBadge.svelte` + its test — deleted.

State:

- `typeFilters`, `CATEGORY_FILTERS`, `categoryOf`, `categoryFilters` removed from `stores.svelte.ts`.
- `doc-type-filters` and `category-filters` localStorage keys are no longer written (any stale values in users' browsers are simply ignored — no migration).

Tests:

- `TypeBadge.test.ts` deleted.
- `stores.test.ts`: removed the `typeFilters`, `categoryOf`, and `categoryFilters` blocks (kept `DOC_TYPES` and `excludeNotDocs`).
- `Sidebar.test.ts`: dropped the category-filter, bookmark-pill, and legacy-panel cases; added a single regression test that asserts no `.type-filters` / `.category-filters` markup is rendered.

## What stayed

- Backend `doc_type` is unchanged. The frontend `DocType` type, `TreeDocument.type`, `FullDocument.type`, and `SearchResult.type` all stay in `api.ts` — the contract is intact, just unused at render time.
- `DOC_TYPES` (the vocabulary) stays in `stores.svelte.ts` because `SearchPanel.svelte` still uses it for its type-select dropdown.
- `excludeNotDocs` stays for the same reason — SearchPanel has an "Exclude non-documentation files" checkbox that sends `exclude_types=not-docs` to the backend.

So the search panel remains fully featured; it just no longer renders the matching `TypeBadge` on each result row, for visual consistency with the rest of the app.

## Verification

- `npm test` — 14 files, 245 tests, all pass.
- `npm run check` — 0 errors, 0 warnings.
- `npm run lint` — clean.
- `npm run build` — clean.

## Notes for future me

If someone wants per-type filtering back, the backend side is unchanged and adding a single dropdown next to "Recent / A–Z" on the source page is small. Don't bring back the pill row.
