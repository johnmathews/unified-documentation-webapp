# Root Docs Category and Resizable Chat Panel

## Root Docs as a Proper Category

The `root_docs` category (files like README.md, CLAUDE.md in the project root) was partially
implemented — the backend returned them and the sidebar rendered them, but they appeared as flat
items directly under each source without a collapsible header. All other categories (Documentation
Directory, Development Journal, Engineering Analysis) had proper collapsible headers with counts.

Changes:
- **Sidebar**: Root Docs now renders as a collapsible category toggle with a document count, matching
  the pattern of the other three categories. Added to expand-all/collapse-all logic.
- **Home page**: Added a "Root Docs" section to each source card on the landing page. Previously,
  root docs were completely absent from the home page. Updated the doc count in stats to include
  root docs alongside docs-directory files.

## Resizable Chat Panel

The chat panel was previously a fixed-width overlay (360px). Made it wider by default and
user-resizable on desktop:

- Default width increased from 360px to 432px (20% wider)
- Added a drag handle on the left edge of the chat panel (desktop only, hidden on mobile
  and when expanded to 50vw)
- Width constrained to 300–900px range
- Width persisted to localStorage, matching the sidebar resize behavior
- Follows the same resize pattern as the existing sidebar (mousedown/mousemove/mouseup,
  user-select: none during drag, brand-colored handle highlight on hover)

## Print Page Feature

Added a print button (printer icon) to the top bar that calls `window.print()`. Comprehensive
`@media print` styles in `app.css`:

- Hides all UI chrome (header, nav, sidebar, chat, breadcrumbs, backdrop)
- Forces light colours so dark mode doesn't print reversed
- Compact 12pt base typography (headings: 18/15/13pt, code: 10pt, tables: 11pt)
- Source badge stripped to plain text (no padding, no background colour)
- Metadata rendered as 3 rows in print: source name, file path, dates
- Page break control: avoids breaks inside code blocks/blockquotes and after headings
- All critical overrides use `!important` to beat Svelte-scoped style specificity

## Document Metadata Layout

Split the single-row metadata bar into two rows in normal view:
- Row 1: source badge + full file path (no truncation, wraps with `word-break: break-all`)
- Row 2: created date + modified date

In print view, this becomes 3 rows (source name, file path, dates) via `flex-direction: column`.

## Duplicate Source Name Validation (MCP Server)

Added validation in `_parse_sources()` in the documentation-mcp-server that raises `ValueError`
on startup if two sources share the same name. Includes the conflicting paths in the error message.

## Service Nav Overhaul

Reorganized the service navigation bar:
- File Picker button moved to first position
- Renamed "Journal Entries" to "Dev Journal"
- Added "Root Docs" and "Engineering Team" nav items with dedicated cross-project
  aggregate pages at `/root-docs` and `/engineering-team`
- Renamed "Engineering Analysis" to "Engineering Team" across all views (sidebar,
  home page, source page, category page)

## Dev Journal Timeline Layout

Improved the journal entry row layout to: day-of-month | app tag | title (right-aligned).
Since entries are already grouped under month headers, the full date was redundant — now
only shows the day number. Removed left/right padding on entry cards for tighter alignment.
Day numbers are hidden with `visibility: hidden` on duplicate days so column alignment is preserved.

## Root Docs Title Convention

Root-level files (README.md, CLAUDE.md) now display their raw filename including extension
instead of using title metadata or normalised names. This prevents confusion when multiple
projects have root docs with identical titles (e.g. both README.md files titled "sv").

## Prettier Configuration

Added `.prettierrc` to the project to stop Neovim's `prettierd` from reverting edits.
The global `~/.prettierrc` (tabWidth 1, proseWrap always, printWidth 121) was being
picked up, but without the Svelte parser plugin `.svelte` files were handled
inconsistently. Added `prettier` and `prettier-plugin-svelte` as dev dependencies
and ran a full format pass across all source files so the codebase matches Prettier
output. Future edits from any tool (Claude Code, Neovim, CI) will produce identical
formatting.

## Server Status Page

Added `/status` page showing backend health, per-source indexing stats (file count, chunk count,
last indexed timestamp with relative time), totals row, health badge, and refresh button.
Proxied via `/api/health` to the backend's `/health` endpoint. Added "Status" link to
service nav bar.

## Docker Image Size Reduction

SvelteKit's adapter-node build output is self-contained — the only external runtime
dependency is `marked`. The previous Dockerfile copied the entire node_modules (57MB
including typescript, esbuild, rollup, vite, svelte compiler). Replaced with
`npm install --no-save marked` (488KB). Image reduced from 468MB to 251MB (46%).
The remaining 249MB is the `node:22-slim` base image.

## Chat Prompt Testing (MCP Server)

Extracted `build_inventory_context` and `build_system_prompt` from the inline chat endpoint
into testable pure functions. Added 32 tests covering:
- System instructions contain all critical phrases (confident answers, inventory awareness)
- Inventory builder includes all 4 categories, per-source stats, handles missing data
- Full prompt assembly with inventory + RAG context

## Test Suite Expansion

Added 60 new tests (43→105 total) in documentation-ui:
- `print-css.test.ts` (36 tests): Parses app.css and asserts all critical print rules exist
  with correct values and `!important` flags. Guards against regression.
- `titles.test.ts` (15 tests): Tests `displaySource` (previously untested), `displayTitle`
  edge cases, and root-level filename convention.
- `stores.test.ts` (11 tests): Tests `CATEGORIES` constant ordering, uniqueness, and labels.

Added 32 new tests in documentation-mcp-server (`test_chat_prompt.py`).

## Chat Input Improvements

Replaced the single-line `<input>` with a `<textarea>` that auto-grows:
- **Shift+Enter** inserts a newline
- **Enter** sends the message
- Auto-resizes up to 150px as content grows

Added message editing: hover a sent user message to reveal a pencil icon. Clicking
it loads the text into the input with an "Editing message" bar. Messages after the
edit point dim to show what will be replaced. Submit re-sends from that point;
Escape or Cancel reverts without changes.

## MCP Server Startup Logging

Added structured startup logs for: LLM provider (anthropic), chat model name,
API key presence, embedding model (all-mpnet-base-v2 ONNX), and all non-secret
`DOCSERVER_*` env vars. Chat model extracted as `CHAT_MODEL` constant, overridable
via `DOCSERVER_CHAT_MODEL` env var.

## Chat Edit Button Improvements

Improved the message edit button UX:
- Moved from absolute-positioned top-right corner to **below** the chat bubble, stacking
  vertically with the message (flex-direction: column, align-items: flex-end)
- Replaced the small 12px two-path SVG with a cleaner 14px single-path pencil icon
- Clicking the edit button now **focuses the textarea** immediately (await tick + focus)
- Added `textareaEl` ref bound to the textarea for programmatic focus control
