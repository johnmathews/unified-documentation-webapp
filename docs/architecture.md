# Architecture

## Overview

The documentation UI is a SvelteKit web application that provides a browsable interface to documentation indexed by the
documentation MCP server. It includes a real-time chat interface powered by Claude that has full context of the
documentation.

## Components

### Frontend (SvelteKit)

- **Layout**: Sidebar + content area, with an optional Search drawer. Chat is no longer a docked panel — it is a
  standalone `/chat` page (conversation history left, active conversation right). The header bar has the product
  name "Documentation Library" (shortened to "Library" on mobile) on the left and two icon groups on the right: utility
  actions (theme toggle, scan now, server status, print) and the Files / Search toggles plus a Chat **nav link**, separated by a
  vertical border. The "scan now" button triggers an immediate ingestion via `POST /api/scan` — the icon (refresh-cw)
  spins while scanning, and a banner anchored to the top-right corner of the viewport shows live progress. The banner
  text walks through: "Checking sources for changes…" (sync), "Found N documents from M sources to update" or
  "No changes detected" (after discovery), "Processing X/N — <doc path>" (per-file as work proceeds), and finally
  "Scan complete — N added, M updated, K removed" (or "Scan failed: …" / "Scan timed out"). Progress is polled from
  `/api/health` every 2 s during a scan; the backend exposes a `current_progress` field that mirrors the latest
  `scan_progress` event from the ingestion worker. The banner has a coloured left border (brand-blue while scanning,
  GOV.UK green for success-with-changes, GOV.UK red for errors) and a × dismiss button; it auto-clears 6 s after
  completion. Pages that display scan-affected data (homepage, `/status`) subscribe to a `scanTick` store and re-fetch
  when it ticks.
  The service navigation bar below the header contains page-level navigation links: Projects and Bookmarks. The
  per-bucket Root Docs / Dev Journal / Learning Journal / Engineering Team views that previously lived here were
  retired in Stage 2 once per-document type filters made the tree view + filter chips a better surface than
  filename-substring buckets. The sidebar (file picker) and search panel have mutual exclusion — opening one closes
  the other. Keyboard shortcuts toggle the side panels: `Cmd/Ctrl+B` (Files), `Cmd/Ctrl+K` (Search), `Cmd/Ctrl+J` (Chat),
  `Cmd/Ctrl+.` (table of contents), and `?` opens a modal listing all shortcuts (suppressed when focus is in an
  input/textarea/contenteditable so search and chat keep accepting `?` as text). Shortcuts ignore Shift/Alt modifiers to
  avoid colliding with browser/devtools combos.
- **Sidebar**: Single-purpose Files panel — tree navigation organized by Source > Folder > Document, mirroring the
  actual on-disk repo structure. Sources collapse independently; the per-source body renders via `TreeNode.svelte`, a
  recursive component that splits each document's `file_path` into nested folder nodes. The top two folder levels
  auto-expand; deeper levels collapse by default. Expand-all / collapse-all controls operate via a one-shot
  `forceExpanded` prop that each `TreeNode` honours once and then releases back to local control. Source-tree data
  comes from `GET /api/sources/tree` (bulk) on first render; the client-side `buildFolderTree` helper
  (`src/lib/tree.ts`) turns the flat `{file_path}` list into the nested `FolderNode` tree. Above the source list
  sits a row of type-filter chips (documentation / journal / prompt / not-docs) backed by the `typeFilters`
  store; `TreeNode` hides leaves whose `type` is unchecked (docs with no type — e.g. predating Stage 2 — stay
  visible by default). Chip state persists to localStorage under `doc-type-filters`.
- **Mobile Responsiveness**: Full-screen modal sidebar/search drawer on mobile (100% width in both portrait and
  landscape) with slide-in/out animations, swipe gestures (edge-swipe to open/close), 44px minimum
  touch targets, safe-area-inset handling for notched devices (top bar, content, sidebar, and chat input all respect
  `env(safe-area-inset-*)`), dynamic viewport height (`100dvh`), explicit 16px font size on mobile inputs to prevent iOS
  Safari auto-zoom, 16px base font size on mobile (up from 14px desktop default) for comfortable reading on phone
  screens, and a landscape-phone breakpoint (`max-height: 500px`) ensuring drawers remain full-screen modals on rotated
  phones. The `/chat` page stacks on mobile: the conversation list is shown by default and opening a conversation swaps
  to the conversation view with a back affordance.
- **Document Viewer**: Renders markdown documents with a single-line metadata bar (bookmark · source · path · type ·
  modified · words) that wraps naturally on narrow viewports. The body prose is capped at `var(--measure)` (75ch) as
  a defensive measure independent of the layout grid. Markdown is rendered via `marked` and passed through
  `sanitiseHtml` (DOMPurify) before reaching `{@html}` — see "Markdown rendering & XSS hardening" below. Relative
  links between documents (e.g. `[text](other.md)`) are automatically rewritten at
  render time so they navigate to the correct document within the app — the original markdown files are unchanged and
  still work on GitHub and locally. Links to `.md` files resolve to `/doc/{docId}` routes; links to other files (images,
  etc.) resolve to `/api/files/{docId}`. The link resolution logic lives in `src/lib/links.ts`, which also injects stable
  slug `id` attributes onto h1–h3 headings (deterministically deduplicated) and exposes `extractHeadings()` to populate
  the document table of contents. The TOC renders as a sticky right-rail (`DocToc.svelte`, 240px wide) next to the
  article column on viewports ≥1200px and hides below that breakpoint; the active heading is tracked via
  `IntersectionObserver` on the `.content` scroller, and clicking an entry smooth-scrolls to that heading. The rail can
  be toggled (open/closed) via `Cmd/Ctrl+.` or the list-icon button on the floating doc-controls pill, with the choice
  persisted in `localStorage` (`doc-toc-open`). A floating pill in the bottom-right corner shows scroll progress
  (percentage) and a bookmark
  toggle that stays in sync with the in-doc bookmark icon. The pill is hidden for PDFs and `@media print`. PDF files are detected by
  file extension and displayed in an inline iframe via the `/api/files/` proxy route, with "Open in new tab" and
  "Download" action buttons above the viewer. A print button in the top bar triggers `window.print()` with `@media print`
  styles that hide all UI chrome, force light colours, use compact 10pt typography with pre-wrap for code blocks, and
  render the metadata bar in a print-friendly layout. Print styles use `!important` to override Svelte-scoped styles.
- **Chat Panel**: Real-time chat with Claude, aware of the currently viewed page. Supports multiline input (Shift+Enter
  for newlines, Enter to send) and message editing (pencil icon below sent user messages — clicking loads the text into
  the input, truncates from the edit point on submit). On desktop, the panel is resizable via a drag handle on its left
  edge (300–900px range, persisted to localStorage). Default width is 432px.
- **Search**: Dedicated search panel (separate from sidebar) with debounced search combining semantic (ChromaDB) and
  keyword (title/file_path) matching. Always-visible source and document-type filters (the type dropdown lists the
  Stage 2 vocabulary: documentation, journal, prompt, not-docs) above a collapsible date-range section, plus an
  **Exclude non-documentation files** checkbox bound to the `excludeNotDocs` store (persists to `exclude-not-docs`).
  When enabled, the search request adds `exclude_type=not-docs` so the backend filters at SQL/Chroma level. Results
  show source tags, type badges, file paths, and date metadata. The panel has mutual
  exclusion with the file picker sidebar — opening one closes the other, but search state (query, filters, results) is
  preserved when the panel is toggled closed and reopened. On desktop, the panel is resizable via a drag handle on its
  right edge (250–800px range, persisted to localStorage as `search-width`). Default width is 320px (384px on large
  screens).
- **Homepage**: Project list table at `/` with sortable columns (Project, Status, Last updated, Documents). Default
  sort is by last updated descending. Click column headers to sort; click again to toggle direction. Between the
  masthead and the table sits a one-line summary bar — `<status badge> · N projects · N documents · last scan Xm ago`
  — that links to `/status`. Each row shows its per-source status badge plus a relative time-ago label beside the
  last-updated date. Health data is fetched in parallel with the tree and degrades gracefully if `/api/health` fails.
  Subtle zebra striping (`var(--bg-zebra)`) anchors row rhythm.
- **Source Pages**: Per-source view at `/source/<name>` rendering one flat (non-indented) table per directory. Each
  directory is its own group — nested folders become sibling groups (e.g. `Docs` and `Docs / Archive`), not indented
  children — with `Root Documents` (repo-root files) always first. Each table has Title / Path / Modified / Lines
  columns; a Recent / A-Z toggle sorts within every group. Data comes from `GET /api/sources/{name}/tree` (404 if the
  source is not configured); `line_count` is derived server-side from stored content. The recursive `TreeNode.svelte`
  concertina is still used by the Sidebar and the folder-browse `/source/<name>/[...path]` route, not here.
- **Server Status**: Admin page at `/status` showing backend health with per-source monitoring. Each source row shows:
  status (Healthy/Warning/Error/Unknown), file count, chunk count, last updated time, and last scanned time. Per-source
  status is computed from consecutive scan failures (1 = warning, 2+ = error) and staleness of last-checked relative to
  the poll interval (>2x = warning, >5x = error). The overall system badge aggregates these: Healthy (all sources OK),
  Degraded (any source warning/error), Error (all sources failing). Error messages are shown on hover. Status badges
  carry `aria-describedby` pointing at a visually-hidden `<dl>` of meanings so screen readers announce the description
  alongside the colour-coded label. Failure counts display in parentheses next to the status label. All columns are
  sortable; sort state persists in URL search params (`?sort=…&dir=…`) so refresh / bookmark / back-forward all work.
  The page polls source health every 30s while the tab is visible (paused on `visibilitychange`, immediate catch-up
  fetch on visible). Pure sort + interval helpers live in `src/routes/status/page-logic.ts` (unit-tested). Proxied
  via `/api/health`.

### Server Routes (SvelteKit)

SvelteKit server routes act as a proxy between the browser and the MCP server backend. This eliminates CORS concerns and
allows runtime configuration of the backend URL.

Routes:

- `GET /api/tree` → proxies to backend `/api/tree`
- `GET /api/documents/:id` → proxies to backend `/api/documents/:id`
- `GET /api/files/:id` → proxies raw binary to backend `/api/files/:id` (preserves Content-Type, Content-Length)
- `GET /api/search?q=...` → proxies to backend `/api/search?q=...`
- `POST /api/chat` → proxies to backend `/api/chat`
- `GET /api/health` → proxies to backend `/health`

### Markdown rendering & XSS hardening

The webapp renders untrusted markdown via `{@html}` in two places: ChatPanel assistant messages and `/doc/[id]`
document bodies. Both render paths pipe their `marked`-rendered HTML through `sanitiseHtml` (in `src/lib/sanitise.ts`),
which wraps `isomorphic-dompurify` with an allowlist covering the tags `marked` emits for standard markdown (plus
`<mark>` for future highlight support) and denies `<script>`, `<style>`, `<iframe>`, all event-handler attributes, and
`javascript:` / `data:` / `vbscript:` URIs. `isomorphic-dompurify` works in both SSR (jsdom shim) and the browser.
ChatPanel's `renderMarkdown` wraps both its return paths (link-rewrite via `renderMarkdownWithLinks` and plain
`marked.parse`); `renderMarkdownWithLinks` in `src/lib/links.ts` also sanitises internally, so the link-rewrite path
is double-wrapped as defence-in-depth (DOMPurify is idempotent). Unit tests in `src/lib/sanitise.test.ts` cover the
strip side, the preserve side, and idempotence.

### Content-Security-Policy

Every server response carries a `Content-Security-Policy` header, set in
`src/hooks.server.ts` via `buildCspHeader()` (in `src/lib/server/csp.ts`).
This is the second security layer — DOMPurify is the in-app sanitiser; CSP
is what the browser enforces even if a sanitiser bypass shipped.

The first-pass policy (round 4) is deliberately permissive:

- `default-src 'self'` — no cross-origin loads by default.
- `script-src 'self' 'unsafe-inline'` — SvelteKit hydration uses inline
  bootstrap scripts; nonce-based tightening is a follow-up.
- `style-src 'self' 'unsafe-inline'` — Svelte component scoped styles
  render as inline `<style>`.
- `img-src 'self' data:` — markdown can embed `data:` image URIs.
- `connect-src 'self'` — backend lives behind the same-origin proxy.
- `frame-src 'self'` — PDFs are embedded same-origin via `/api/files/...`.
- `frame-ancestors 'none'` — no clickjacking.
- `base-uri 'self'`, `form-action 'self'`, `object-src 'none'` — lock the
  classic CSP escape hatches.

The handler only sets the header if it's not already present on the
response, so per-route overrides remain possible. Unit tests in
`src/lib/server/csp.test.ts` lock the directive shape.

### Logging

The webapp emits structured JSON logs to stdout (and stderr for errors), matching the backend's log shape so the
streams aggregate cleanly when read together. The logger lives in `src/lib/server/logger.ts` and is wired into
SvelteKit via `src/hooks.server.ts`. All entries include `timestamp`, `level`, `logger: "docwebapp"`, `message`, and
an `event` discriminator.

| Event             | When                                            | Notable fields                                                |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `server_start`    | Once on boot                                    | `api_url`, `node_env`, `port`                                 |
| `request_done`    | Every browser request that completes            | `request_id`, `method`, `path`, `status`, `duration_ms`       |
| `request_error`   | Browser request threw before producing response | `request_id`, `method`, `path`, `duration_ms`, `error`        |
| `server_error`    | SvelteKit `handleError` hook fires              | `request_id`, `path`, `error`, `stack`                        |
| `upstream_call`   | Proxy fetch to backend completed                | `method`, `upstream_path`, `upstream_status`, `duration_ms`   |
| `upstream_error`  | Proxy fetch threw or timed out                  | `method`, `upstream_path`, `duration_ms`, `error`             |

Severity rules: `request_done` and `upstream_call` log at `info` for 2xx, `warn` for 4xx, `error` for 5xx.
`upstream_call` also escalates to `warn` when `duration_ms ≥ 1000` (slow-call signal). Failures inside the proxy
(`upstream_error`) — e.g. backend container down, DNS failure, 90s POST timeout — log at `error` with the underlying
exception message; previously these were swallowed silently.

A short per-request id (base36 counter) is generated in the `handle` hook, stored on `event.locals.requestId`, and
included in every log line for the request, so a single user action can be traced through the request log and any
errors it produced.

### Backend (Documentation MCP Server)

The MCP server provides REST API endpoints alongside its existing MCP tools:

- `GET /api/tree` — Legacy category-grouped document tree (retained for backwards compatibility)
- `GET /api/sources/tree` — Bulk per-source file listings used by the sidebar and home page
- `GET /api/sources/:name/tree` — Single-source file listing used by per-source pages
- `GET /api/documents/:doc_id` — Full document content
- `GET /api/search?q=&source=&limit=` — Combined semantic search (ChromaDB) and keyword search on title/file_path (SQLite
  LIKE)
- `POST /api/chat` — RAG-powered chat (searches docs, sends context to Claude)

## Deployment

Both services run in the same docker-compose stack:

- `docserver` — MCP server on port 8080 (mapped to 8085)
- `documentation-webapp` — SvelteKit app on port 3000 (mapped to 3002)

The UI connects to the backend via the internal Docker network using `http://docserver:8080`.

## Environment Variables

| Variable            | Where        | Description                                    |
| ------------------- | ------------ | ---------------------------------------------- |
| `API_URL`           | UI container | Backend URL (default: `http://localhost:8085`) |
| `ANTHROPIC_API_KEY` | MCP server   | Required for the chat endpoint                 |
| `PORT`              | UI container | Server port (default: `3000`)                  |
