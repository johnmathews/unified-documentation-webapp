# Architecture

## Overview

The documentation UI is a SvelteKit web application that provides a browsable interface
to documentation indexed by the documentation MCP server. It includes a real-time chat
interface powered by Claude that has full context of the documentation.

## Components

### Frontend (SvelteKit)

- **Layout**: Three-panel layout with sidebar, content area, and collapsible chat panel
- **Sidebar**: Tree navigation organized by Source > Category (root\_docs/docs/journal/engineering\_team) > Document, with expand/collapse controls inside the tree section and a link to the journal timeline. Each source has a deterministic color tag for visual distinction. Root-level documents (e.g. README.md) appear directly under each source, before subcategories.
- **Mobile Responsiveness**: Full-screen modal sidebar and chat panels on mobile (100% width in both portrait and landscape) with slide-in/out animations for both panels, swipe gestures (edge-swipe to open/close panels), 44px minimum touch targets, safe-area-inset handling for notched devices (top bar, content, sidebar, and chat input all respect `env(safe-area-inset-*)`), dynamic viewport height (`100dvh`), explicit 16px font size on mobile inputs to prevent iOS Safari auto-zoom, 16px base font size on mobile (up from 14px desktop default) for comfortable reading on phone screens, and a landscape-phone breakpoint (`max-height: 500px`) ensuring panels remain full-screen modals on rotated phones. The chat panel expand/collapse button is hidden on mobile since the panel is always full-width.
- **Document Viewer**: Renders markdown documents with metadata headers
- **Chat Panel**: Real-time chat with Claude, aware of the currently viewed page
- **Search**: Debounced search across all documentation via the sidebar
- **Journal Timeline**: Cross-project chronological view of all journal entries at `/journal`

### Server Routes (SvelteKit)

SvelteKit server routes act as a proxy between the browser and the MCP server backend.
This eliminates CORS concerns and allows runtime configuration of the backend URL.

Routes:
- `GET /api/tree` → proxies to backend `/api/tree`
- `GET /api/documents/:id` → proxies to backend `/api/documents/:id`
- `GET /api/search?q=...` → proxies to backend `/api/search?q=...`
- `POST /api/chat` → proxies to backend `/api/chat`

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

| Variable | Where | Description |
|----------|-------|-------------|
| `API_URL` | UI container | Backend URL (default: `http://localhost:8085`) |
| `ANTHROPIC_API_KEY` | MCP server | Required for the chat endpoint |
| `PORT` | UI container | Server port (default: `3000`) |
