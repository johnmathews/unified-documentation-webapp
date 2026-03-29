# Architecture

## Overview

The documentation UI is a SvelteKit web application that provides a browsable interface
to documentation indexed by the documentation MCP server. It includes a real-time chat
interface powered by Claude that has full context of the documentation.

## Components

### Frontend (SvelteKit)

- **Layout**: Three-panel layout with sidebar, content area, and collapsible chat panel. The service navigation bar has: File Picker (sidebar toggle), All Documents, Root Docs, Dev Journal, and Engineering Team. The top bar has the product name on the left and theme/print/chat toggles on the right. The sidebar (file picker) is closed by default and toggled via the nav bar button.
- **Sidebar**: Tree navigation organized by Source > Category (Root Docs/Documentation Directory/Development Journal/Engineering Team) > Document, with expand/collapse controls inside the tree section. Each source has a deterministic color tag for visual distinction. All four categories are collapsible sections with document counts. A collapsible "Filter categories" section with GOV.UK-style small checkboxes allows globally toggling category visibility (persisted to localStorage). The `CATEGORIES` constant in `stores.svelte.ts` is the single source of truth for category definitions.
- **Mobile Responsiveness**: Full-screen modal sidebar and chat panels on mobile (100% width in both portrait and landscape) with slide-in/out animations for both panels, swipe gestures (edge-swipe to open/close panels), 44px minimum touch targets, safe-area-inset handling for notched devices (top bar, content, sidebar, and chat input all respect `env(safe-area-inset-*)`), dynamic viewport height (`100dvh`), explicit 16px font size on mobile inputs to prevent iOS Safari auto-zoom, 16px base font size on mobile (up from 14px desktop default) for comfortable reading on phone screens, and a landscape-phone breakpoint (`max-height: 500px`) ensuring panels remain full-screen modals on rotated phones. The chat panel expand/collapse button is hidden on mobile since the panel is always full-width.
- **Document Viewer**: Renders markdown documents with a two-row metadata header (row 1: source badge + file path; row 2: created/modified dates). Relative links between documents (e.g. `[text](other.md)`) are automatically rewritten at render time so they navigate to the correct document within the app — the original markdown files are unchanged and still work on GitHub and locally. Links to `.md` files resolve to `/doc/{docId}` routes; links to other files (images, etc.) resolve to `/api/files/{docId}`. The link resolution logic lives in `src/lib/links.ts`. PDF files are detected by file extension and displayed in an inline iframe via the `/api/files/` proxy route, with "Open in new tab" and "Download" action buttons above the viewer. A print button in the top bar triggers `window.print()` with `@media print` styles that hide all UI chrome, force light colours, use compact 12pt typography, and render the metadata as three rows (source name, file path, dates) for clean output. Print styles use `!important` to override Svelte-scoped styles.
- **Chat Panel**: Real-time chat with Claude, aware of the currently viewed page. Supports multiline input (Shift+Enter for newlines, Enter to send) and message editing (pencil icon below sent user messages — clicking loads the text into the input, truncates from the edit point on submit). On desktop, the panel is resizable via a drag handle on its left edge (300–900px range, persisted to localStorage). Default width is 432px.
- **Search**: Debounced search across all documentation via the sidebar
- **Journal Timeline**: Cross-project chronological view of all journal entries at `/journal`
- **Root Docs**: Cross-project view of root-level files (README, CLAUDE.md) at `/root-docs`, grouped by source
- **Engineering Team**: Cross-project view of evaluation reports and improvement plans at `/engineering-team`, grouped by source
- **Server Status**: Admin page at `/status` showing backend health, per-source indexing stats (file count, chunk count, last indexed time), and a refresh button. Proxied via `/api/health`.

### Server Routes (SvelteKit)

SvelteKit server routes act as a proxy between the browser and the MCP server backend.
This eliminates CORS concerns and allows runtime configuration of the backend URL.

Routes:
- `GET /api/tree` → proxies to backend `/api/tree`
- `GET /api/documents/:id` → proxies to backend `/api/documents/:id`
- `GET /api/files/:id` → proxies raw binary to backend `/api/files/:id` (preserves Content-Type, Content-Length)
- `GET /api/search?q=...` → proxies to backend `/api/search?q=...`
- `POST /api/chat` → proxies to backend `/api/chat`
- `GET /api/health` → proxies to backend `/health`

### Backend (Documentation MCP Server)

The MCP server provides REST API endpoints alongside its existing MCP tools:

- `GET /api/tree` — Document tree organized by source and category
- `GET /api/documents/:doc_id` — Full document content
- `GET /api/search?q=&source=&limit=` — Semantic search via ChromaDB
- `POST /api/chat` — RAG-powered chat (searches docs, sends context to Claude)

## Deployment

Both services run in the same docker-compose stack:

- `docserver` — MCP server on port 8080 (mapped to 8085)
- `documentation-ui` — SvelteKit app on port 3000 (mapped to 3002)

The UI connects to the backend via the internal Docker network using `http://docserver:8080`.

## Environment Variables

| Variable            | Where        | Description                                    |
|---------------------|--------------|------------------------------------------------|
| `API_URL`           | UI container | Backend URL (default: `http://localhost:8085`)  |
| `ANTHROPIC_API_KEY` | MCP server   | Required for the chat endpoint                 |
| `PORT`              | UI container | Server port (default: `3000`)                  |
