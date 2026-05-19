# Development

## Prerequisites

- Node.js 22+
- [uv](https://docs.astral.sh/uv/) (for running the backend)
- The documentation MCP server repo at `../documentation-mcp-server`

## Running locally

You need **two processes** running: the backend MCP server and the frontend SvelteKit dev server.

### 1. Start the backend

```bash
cd ../documentation-mcp-server

# Install dependencies (first time only)
uv sync --group dev

# Start the server
DOCSERVER_DATA_DIR=./local-data DOCSERVER_CONFIG=./config/sources.local.yaml uv run python -m docserver
```

The backend starts on **port 8080** by default.

- `DOCSERVER_DATA_DIR=./local-data` is required because the default `/data` path only exists inside the Docker container.
- `DOCSERVER_CONFIG=./config/sources.local.yaml` points to a local sources config. See the backend repo's README for how to configure sources.

### 2. Start the frontend

```bash
# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

The frontend starts on **port 5173** and proxies API requests to the backend at `http://localhost:8080` (configured in `.env`).

### Verify it works

Open http://localhost:5173 — you should see the UI without "Backend unavailable" errors. If the backend has no sources configured, you'll see "No documentation sources have been indexed yet", which is normal.

## Configuration

The `.env` file configures the backend URL for local development:

```
API_URL=http://localhost:8080
```

In Docker/production, this is overridden by the `environment` key in `docker-compose.yml` (`API_URL=http://docserver:8080`). Do not change the port in `.env` — the backend defaults to 8080.

## Key commands

```bash
npm run dev            # Start dev server
npm run build          # Production build
npm run preview        # Preview production build
npm run test           # Run unit tests
npm run test:coverage  # Run unit tests with coverage (HTML report at coverage/index.html)
npm run test:e2e       # Run end-to-end tests
```

`test:coverage` uses the `@vitest/coverage-v8` provider. The text summary
prints to stdout and the HTML report is written to `coverage/`
(gitignored). No thresholds are configured yet — visibility only.

## Project structure

```
src/
  lib/
    api.ts                # Client-side API types, fetch wrappers, SSE streaming
    sse.test.ts           # Tests for SSE parser and streaming chat
    tree.ts               # Pure helpers that build a nested FolderNode from a flat doc list
    tree.test.ts          # Unit tests for buildFolderTree / collectAllDocs
    stores.svelte.ts      # Shared reactive state (doc ID, sidebar/chat state, legacy category filters)
    colors.ts             # Deterministic source tag colors
    titles.ts             # Display formatting for sources and titles
    links.ts              # Relative-link rewriter; sanitises marked output before return
    sanitise.ts           # sanitiseHtml() — DOMPurify wrapper for both {@html} surfaces
    server/
      api.ts              # Server-side proxy utilities (proxyGet/proxyPost)
    components/
      Sidebar.svelte      # Source-rooted folder tree navigation (uses TreeNode)
      TreeNode.svelte     # Recursive collapsible folder/leaf renderer
      TocPanel.svelte     # Table of contents for the current document (active heading tracking)
      FloatingDocControls.svelte  # Bottom-right pill: scroll progress + bookmark toggle (44px touch targets)
      SearchPanel.svelte   # Search with source and date filters
      ChatPanel.svelte    # Conversation area used by the /chat page (.messages is aria-live)
      Breadcrumbs.svelte  # Breadcrumb navigation (clickable folder segments; supports a generic `crumbs` prop)
      BookmarkButton.svelte  # Bookmark toggle (inline in the doc-meta bar)
  routes/
    +layout.svelte        # Main layout (header, sidebar, search drawer; Chat is a nav link to /chat)
    chat/                 # Standalone /chat page (history list + conversation area)
    source/[name]/[...path]/  # Folder-browse route (concertina subtree, shared with /source/[name])
    +page.svelte          # Home page (project list with metadata + summary bar)
    doc/[id]/
      +page.svelte        # Document viewer (single-line metadata bar, 75ch body measure)
    status/
      +page.svelte        # Server status (sort persisted to URL; polls health every 30s)
      page-logic.ts       # Pure helpers: parseSortParams / buildSortQuery / POLL_INTERVAL_MS
    api/                  # Server-side proxy routes
      tree/
      search/
      health/
      documents/[...id]/
      files/[...id]/
      chat/
```

## Docker

```bash
# Build
docker build -t unified-documentation-webapp .

# Run (standalone, connecting to a backend on the host)
docker run -p 3001:3000 -e API_URL=http://host.docker.internal:8080 unified-documentation-webapp
```

In production, both services run via `docker-compose.yml` where the UI connects to the backend at `http://docserver:8080` (container-to-container networking).

## Logs

The server emits structured JSON logs to stdout (errors to stderr). One line per request plus a line per upstream
proxy call. View them with:

```bash
# In Docker
docker logs -f documentation-webapp

# Locally, the dev server's `console`-style adapter output mixes with the JSON lines —
# pipe through jq for readability:
npm run dev 2>&1 | jq -R 'fromjson? // .'
```

See `docs/architecture.md` § Logging for the full list of events and fields.

## SSE streaming

The chat feature uses Server-Sent Events for real-time progress during the agentic tool-use loop. The backend (`sse-starlette`) sends events with `\r\n` line endings (CRLF), which the frontend normalizes to `\n` (LF) before parsing. The `parseSSE()` function in `api.ts` extracts event type and data from each SSE frame. Event types: `status`, `tool_call`, `tool_result`, `reply`, `error`.

The SvelteKit server route at `src/routes/api/chat/stream/+server.ts` proxies the SSE stream from the backend, preserving the streaming `ReadableStream` body without buffering.
