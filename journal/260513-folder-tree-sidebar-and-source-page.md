# Folder-tree sidebar + source page

Stage 1 of a cross-repo plan (workspace-root
`.engineering-team/improvement-plan-260513-repo-structure.md`) to make
per-source repo structure visible in the webapp.

## What this change ships

The nine hardcoded categories (`root_docs`, `docs`, `journal`,
`learning_journal`, `engineering_team`, `research`, `skills`, `runbooks`,
`pdf`) no longer drive the sidebar or per-source page. They are replaced by
a real folder tree derived from each doc's `file_path`. Three concrete deltas:

1. **New `src/lib/tree.ts`** with `buildFolderTree(docs): FolderNode`
   (path → nested folder structure) and `collectAllDocs(node)`. Pure
   functions, 9 unit tests.
2. **New `TreeNode.svelte`** — recursive collapsible component. Top two
   levels auto-expand at mount. Accepts an optional `sortDocs` comparator
   so the source page's Recent / A-Z toggle can re-order leaves at every
   depth. `expanded?: boolean | null` lets a parent force-expand or
   force-collapse for "expand all" / "collapse all" buttons, then releases
   back to per-node control after the first click.
3. **Three consumers rewritten:**
   - `Sidebar.svelte` consumes the new `/api/sources/tree` bulk endpoint.
     Filter-categories panel removed (Stage 2 replaces it with a type
     filter).
   - `routes/source/[name]/+page.svelte` consumes `/api/sources/{name}/tree`
     and renders `<TreeNode expanded={true}>`. The category-grouped sections
     are gone; the tree shows the actual folder hierarchy.
   - `routes/+page.svelte` (home) uses the bulk endpoint plus
     `source.files.length` for doc counts.
4. **`Breadcrumbs.svelte`** — `category?` prop replaced with `filePath?`.
   Intermediate folder segments render as plain text (no routes exist for
   arbitrary subpaths). Old category-guessing chain on the doc detail page
   is gone.

## What still uses the old shape

- `routes/source/[name]/[category]/+page.svelte` still calls `fetchTree()`
  and slices the nine-bucket response. Its breadcrumb is downgraded to
  source + title only (the category prop is gone). The route is orphaned
  by the sidebar/source-page rewrites — Stage 2 deletes it along with
  `CATEGORIES`, `categoryFilters`, and `categorizeFilePath`.
- The service nav links (`/root-docs`, `/journal`, `/learning-journal`,
  `/engineering-team`) still point to routes that haven't been touched.
  Same — Stage 2 cleanup.

## Decisions worth recording

- **Recursive component uses self-import**, not `<svelte:self>` (deprecated
  in Svelte 5). The self-import is the recommended replacement.
- **`untrack(() => depth < 2)` for the initial expanded state.** Without
  `untrack`, `svelte-check` flags "this reference only captures the initial
  value of `depth`" as a warning — but that's exactly what we want, since
  `depth` is stable for any given component instance. `untrack` makes the
  intent explicit and silences the warning.
- **No component tests for TreeNode**. The codebase has
  `@testing-library/svelte` installed but no existing component tests, and
  setting up Svelte 5 component testing as part of this stage would be its
  own work unit. The component's behaviour is verified end-to-end via
  smoke test (sidebar + source page).
- **No transitional bucket-flatten layer.** An earlier draft of the plan
  built the tree from the nine-bucket response so the new endpoint could
  ship later. Reverted to consuming the new endpoint directly — fewer
  moving parts, no migration step.

## Tests

- 269 → 269 passes (+9 from `tree.test.ts`, -0 from rewrites).
  `svelte-check`: 0 errors, 0 warnings across 406 files.

## Smoke test

Booted the dev stack against the existing `local-data/` DB. Pi-harness
rendered with `.engineering-team/` (1 file), `journal/` (6 entries),
and three root-level files (AGENTS.md, CONTRIBUTING.md, README.md) — the
exact structure of the source repo. Breadcrumbs on a journal doc showed
`Home > Pi Harness > journal > 2026-05-12 — Journal bootstrap`. No console
errors.
