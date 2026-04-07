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
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run test      # Run unit tests
npm run test:e2e  # Run end-to-end tests
```

## Project structure

```
src/
  lib/
    api.ts                # Client-side API types, fetch wrappers, SSE streaming
    sse.test.ts           # Tests for SSE parser and streaming chat
    stores.svelte.ts      # Shared reactive state (doc ID, category filters)
    colors.ts             # Deterministic source tag colors
    titles.ts             # Display formatting for sources and titles
    server/
      api.ts              # Server-side proxy utilities (proxyGet/proxyPost)
    components/
      Sidebar.svelte      # File tree navigation + category filters
      SearchPanel.svelte   # Search with source and date filters
      ChatPanel.svelte    # RAG chat interface
      Breadcrumbs.svelte  # Breadcrumb navigation
  routes/
    +layout.svelte        # Main layout (header, sidebar, search, chat panels)
    +page.svelte          # Home page (project list with metadata)
    doc/[id]/
      +page.svelte        # Document viewer
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

## SSE streaming

The chat feature uses Server-Sent Events for real-time progress during the agentic tool-use loop. The backend (`sse-starlette`) sends events with `\r\n` line endings (CRLF), which the frontend normalizes to `\n` (LF) before parsing. The `parseSSE()` function in `api.ts` extracts event type and data from each SSE frame. Event types: `status`, `tool_call`, `tool_result`, `reply`, `error`.

The SvelteKit server route at `src/routes/api/chat/stream/+server.ts` proxies the SSE stream from the backend, preserving the streaming `ReadableStream` body without buffering.
