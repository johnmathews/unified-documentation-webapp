# Stage 2 frontend — document type badges, filters, search toggle

Stage 2 W2.6–W2.9 plus orphan retirement land in a single frontend commit on
`feature/repo-structure-stage2`. The webapp now reads the backend's `type`
field on every document, surfaces it as a badge, and gives the user one
filter for the tree views and a separate search-only toggle for "exclude
not-docs". The legacy nine-category code that Stage 1 left in place is gone
along with the orphan routes that depended on it.

## What changed

1. **`DocType` + `TypeBadge` (W2.6).** `api.ts` now exports
   `type DocType = "documentation" | "journal" | "prompt" | "not-docs"`,
   and `TreeDocument`, `FullDocument`, `SearchResult`, and `BookmarkEntry`
   all carry an optional `type?: DocType`. The new
   `TypeBadge.svelte` renders a small rounded chip coloured per type; it
   renders nothing for nullish input so pre-Stage-2 docs don't show a
   placeholder.
2. **`typeFilters` + `DOC_TYPES` (W2.7).** `stores.svelte.ts` replaces the
   nine-category `CATEGORIES` / `categoryFilters` with a four-key
   `DOC_TYPES` and a `typeFilters` store persisting to `doc-type-filters`.
   `typeFilters.isVisible()` returns `true` for nullish or unknown types so
   the UI stays forward-compatible — docs the server hasn't classified yet
   (or with a future vocabulary entry) don't disappear silently. `TreeNode`
   applies the filter; the folder count reflects the visible set so users
   see numbers consistent with the leaves they can see.
3. **Filter chips in Sidebar and source page (W2.7 UI).** Both surfaces get
   a row of four chips (Documentation / Journal / Prompt / Not docs) backed
   by `typeFilters.toggle()`. State is shared — toggling on either surface
   updates the other on next render.
4. **Search exclude-not-docs toggle (W2.8).** New `excludeNotDocs` store
   (`exclude-not-docs` localStorage), default off. `SearchPanel` renders a
   labelled checkbox next to the type dropdown; when on, `buildFilters()`
   adds `excludeTypes: ["not-docs"]` and `searchDocuments` serialises it
   as repeated `exclude_type=` query params for the backend. The type
   dropdown's options are now the four Stage 2 types (was: legacy nine
   categories). Search results render the type badge alongside the
   source tag.
5. **Doc detail badge (W2.9).** `/doc/[id]/+page.svelte` renders a
   `TypeBadge` in the `doc-meta-row` between the source link and the
   file-path display.
6. **Bookmarks page migrated.** Was grouping bookmarks by
   `categorizeFilePath(file_path)`; now groups by `bm.type ?? "documentation"`
   with labels matching the Stage 2 vocabulary. Drops the
   `categorizeFilePath` import — last live caller in the webapp.
7. **Orphan routes retired.** Deleted:
   - `src/routes/root-docs/` (replaced by the tree view's root level)
   - `src/routes/journal/` (replaced by type filter + tree)
   - `src/routes/learning-journal/` (replaced by type filter + tree)
   - `src/routes/engineering-team/` (replaced by type filter + tree)
   - `src/routes/source/[name]/[category]/` (replaced by full source tree)
   And the service-nav links pointing at the first four routes. Each
   surface had no inbound link other than the service-nav row (Stage 1's
   audit confirmed this), and each was a flat list driven by
   `categorizeFilePath` heuristics that the per-document type now does
   correctly via backend config.
8. **Legacy code purged.** From `api.ts`: `TreeSource`, `fetchTree`,
   `categorizeFilePath`. From `stores.svelte.ts`: `CATEGORIES`,
   `CategoryKey`, `categoryFilters`, `loadFilters`. From `api.test.ts`:
   the fetchTree, TreeSource regression, categorizeFilePath, and
   docType-filter describe blocks. `stores.test.ts` rewritten for
   `DOC_TYPES` / `typeFilters` / `excludeNotDocs`.

## Deviations from the plan

- **Type dropdown options.** Plan said "Replace docType `<select>` options
  with DOC_TYPES"; we did. Side effect: existing search filter URLs that
  serialised the old category keys (root_docs, docs, etc.) no longer match.
  Acceptable — those URLs were never shared externally; the toggle persists
  in localStorage so the user's last state survives.
- **Search exclude toggle UX.** Plan put the toggle in `primary-filters`;
  we placed it inside the Type fieldset's wrapper so it reads as a
  refinement of the Type filter rather than a parallel control. Same store,
  same behaviour; just feels more discoverable next to the dropdown.

## Visual verification (still TODO for the user)

Stage 1's session ran the local dev stack in a browser; Stage 2 stops
short of that — unit + component tests + svelte-check cover code
correctness, but the plan calls for a manual browser check after W2.7
(filter UI) and W2.8 (search toggle). The minimal config flow is:

```bash
# In documentation-server/
cat > /tmp/sources-test.yaml <<'EOF'
sources:
  - name: test
    path: /Users/john/projects/home-server/documentation/documentation-server
    patterns: ["**/*.md"]
EOF
DOCSERVER_CONFIG=/tmp/sources-test.yaml \
DOCSERVER_DATA_DIR=$(pwd)/local-data \
DOCSERVER_POLL_INTERVAL=99999 \
uv run python -m docserver

# In documentation-webapp/
npm run dev
```

Then verify:
- Toggling "Journal" in the sidebar hides journal-typed docs in both
  the sidebar and `/source/test`.
- Filter state survives a page reload.
- In `/?` → search panel, toggling "Exclude non-documentation files"
  removes any `not-docs` results.

If `local-data/config/sources.local.yaml` has the previously-reported
duplicate-source-name bug, use the `/tmp/sources-test.yaml` override
above instead.

## Test summary

- vitest: 250 passed (was 289 — net drop reflects the deleted legacy
  describe blocks, partially offset by 6 new TypeBadge tests + 12 new
  store tests).
- svelte-check: 0 errors, 0 warnings.

## Open follow-ups

- Stage 3 W3.6 adds the chat-side `excludeNotDocs` toggle (the store is
  already shared, so this is a UI-only addition).
- The doc-detail page badge sits between the source link and file-path
  text; if it becomes visually noisy once real classifications land,
  shrink the badge or stack the metadata rows differently.
