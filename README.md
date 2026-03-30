# Documentation UI

A web interface for browsing, searching, and chatting with documentation indexed by the
[documentation MCP server](https://github.com/johnmathews/documentation-mcp-server). Built with SvelteKit and styled
after the GOV.UK Design System.

## Features

- **Tree navigation** — Browse documents organized by source, then by category (Root Docs, Documentation Directory,
  Journal, Engineering Analysis). Collapsible categories with document counts and filterable via checkboxes.
- **Semantic search** — Debounced full-text search across all indexed documentation via ChromaDB.
- **RAG chat** — Ask questions about your docs. Claude retrieves relevant context and responds with cited answers. The
  chat panel is aware of the currently viewed document.
- **Journal timeline** — Cross-project chronological view of all journal entries at `/journal`.
- **Print view** — Print button in the top bar produces clean output: all chrome hidden, compact 12pt typography, light
  colours forced, page break control on code blocks and headings.
- **Responsive** — Desktop 3-panel layout, tablet overlay drawers, mobile full-screen panels with swipe gestures and 44px
  touch targets.
- **Dark mode** — Toggle in the top bar, persisted to localStorage.
- **Resizable panels** — Both the sidebar and chat panel are drag-resizable on desktop, with widths persisted to
  localStorage.

## Quick Start

Requires the documentation MCP server running locally (default port 8080).

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` and proxies API requests to the backend configured in `.env`:

```
API_URL=http://localhost:8080
```

## Docker Deployment

Both services run in the same docker-compose stack:

```bash
docker compose up -d
```

| Service                       | Internal Port | Mapped Port |
| ----------------------------- | ------------- | ----------- |
| `docserver` (MCP server)      | 8080          | 8085        |
| `documentation-ui` (this app) | 3000          | 3002        |

The UI connects to the backend via the Docker network at `http://docserver:8080`. The Docker image is built and pushed to
`ghcr.io/johnmathews/documentation-ui` on every push to `main`.

## Commands

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `npm run dev`     | Start dev server with HMR        |
| `npm run build`   | Production build                 |
| `npm run preview` | Preview production build locally |
| `npm test`        | Run test suite (vitest)          |
| `npm run lint`    | Run ESLint                       |

## Environment Variables

| Variable            | Where        | Description                                    |
| ------------------- | ------------ | ---------------------------------------------- |
| `API_URL`           | UI container | Backend URL (default: `http://localhost:8085`) |
| `ANTHROPIC_API_KEY` | MCP server   | Required for the chat/RAG endpoint             |
| `PORT`              | UI container | Server port (default: `3000`)                  |

## Architecture

SvelteKit with adapter-node for Docker deployment. Server-side routes proxy all `/api/*` requests to the MCP server
backend, eliminating CORS concerns and keeping the backend URL as a runtime config. See
[docs/architecture.md](docs/architecture.md) for full details.
