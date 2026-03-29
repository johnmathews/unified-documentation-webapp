# Search panel: move from sidebar to navbar with filters

## What changed

Moved the search feature out of the file picker sidebar into a dedicated SearchPanel component, accessible via a magnifying glass icon in the header navbar (grouped next to the Chat button).

### New SearchPanel component
- GOV.UK-style search input with joined blue submit button
- Collapsible **Filters** section with:
  - **Source filter** — dropdown select populated dynamically from the health API
  - **Created date** — GOV.UK Day/Month/Year inputs for After/Before range
  - **Modified date** — same pattern for modified dates
  - "Clear all filters" link when filters are active, with active filter count badge
- Results show title (as link), source tag, created/modified dates, and snippet
- Full responsive/mobile support with 44px touch targets

### API changes
- New `SearchFilters` interface with `source`, `createdAfter`, `createdBefore`, `modifiedAfter`, `modifiedBefore`
- `searchDocuments()` now accepts optional filters; source param is passed to backend, date filtering is done client-side on the returned results
- New `fetchSources()` function using the health endpoint

### Sidebar cleanup
- Removed search box, search results rendering, and all search-related CSS from Sidebar
- Sidebar now contains only category filters and the file tree

### Layout integration
- Search icon button in header band 1, positioned next to Chat for consistency
- SearchPanel opens as a fixed left-side overlay (same pattern as sidebar/chat)
- Opening search closes the file picker, and vice versa
- Escape key and backdrop click close the search panel

### Other fixes
- Fixed API fallback port from 8085 to 8080 in `src/lib/server/api.ts` to match `.env` and Docker config
- Fixed pre-existing test failures in `stores.test.ts` (CATEGORIES count not updated for PDF category)
- Updated CLAUDE.md backend dependency section (was referencing wrong port 8085)
- Rewrote `docs/development.md` with correct local dev setup instructions including backend startup command

## Tests
- 9 new tests for search filters and fetchSources
- 2 pre-existing test fixes for PDF category count
- All 114 tests passing

## Bug investigation: tracked files silently reverted

During this session, edits to tracked files were silently reverted to HEAD at least 3 times. Untracked files survived. Investigated all running processes, git hooks, formatters, and Claude Code hooks — none were the cause. The pattern is consistent with `git restore .` but nothing was found that would trigger it. Documented in `BUG-FILE-REVERTS.md` with reproduction steps and a plan to use worktrees as both a diagnostic test and mitigation.
