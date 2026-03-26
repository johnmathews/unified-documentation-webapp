# Documentation UI

## Project Structure

- `src/lib/` - Shared library code
  - `api.ts` - Client-side API functions (types + fetch wrappers)
  - `stores.svelte.ts` - Shared reactive state (current doc ID)
  - `server/api.ts` - Server-side proxy utilities
  - `components/` - Svelte components (Sidebar, ChatPanel)
- `src/routes/` - SvelteKit pages and API proxy routes
- `docs/` - Project documentation
- `journal/` - Development journal

## Key Commands

- `npm install` - Install dependencies
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build

## Architecture Decisions

- **SvelteKit** with adapter-node for Docker deployment
- **Server-side proxy** — SvelteKit server routes proxy `/api/*` to the MCP server backend, configured via `API_URL` env var at runtime
- **No CORS needed** — Browser talks to same origin, server proxies to backend
- **Dark theme** with CSS custom properties
- **Responsive** — Desktop (3 panels), tablet (overlay drawers), phone (85%-width sidebar with backdrop, swipe gestures, 44px touch targets, safe-area-insets)
- **Document categories** — root\_docs, docs, journal, engineering\_team

## Backend Dependency

This app requires the documentation MCP server running. In Docker, it connects via `http://docserver:8080`. For local dev, set `API_URL=http://localhost:8085` in `.env`.
