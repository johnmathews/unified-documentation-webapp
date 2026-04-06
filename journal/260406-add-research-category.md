# Add Research Document Category

Added a new "Research" category to the documentation webapp so that markdown files
in `research/` directories are displayed in their own section rather than being
lumped into the generic "Documentation Directory" category.

## Changes

### Backend (documentation-server)
- Added `research/` path detection to the categorization logic in `knowledge_base.py`,
  placed before the generic `docs` catch-all
- Research documents sort by `created_at` descending (most recent first)
- Added `research` key to the sources dict and tree response

### Frontend (documentation-webapp)
- Added `{ key: "research", label: "Research" }` to the `CATEGORIES` constant
- Added `research?: TreeDocument[]` to `TreeSource` interface (optional for backward
  compatibility with older backend versions)
- Added `research/` detection to `categorizeFilePath()` for client-side filtering
- Added Research section to the sidebar tree view with a magnifying glass icon
- Updated source overview page with research stat tag and document list section
- Updated category page to handle `research` route and label
- Updated Breadcrumbs component with "Research" label
- Updated homepage `allDocs()` to include research documents in counts

### Tests
- Updated `stores.test.ts`: category count (6 -> 7), ordering tests, key validation
- Updated `api.test.ts`: `categorizeFilePath` tests, docType filter tests, regression
  tests for optional field handling

### Documentation
- Updated `docs/architecture.md` to list Research in sidebar categories and source pages
- Updated `CLAUDE.md` category list

## Decisions
- Research is optional (`research?: TreeDocument[]`) like `engineering_team` and
  `learning_journal`, so the frontend gracefully handles older backends that don't
  include it
- Sort order defaults to date descending (most recent first), matching how the user
  wants to browse research documents
- Placed between Engineering Team and PDF in the category order
