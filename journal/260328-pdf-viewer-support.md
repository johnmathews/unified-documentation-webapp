# PDF viewer support

Added inline PDF viewing in the document viewer. PDFs from indexed sources are displayed in an iframe with action buttons, rather than being rendered through the markdown pipeline.

## Changes

### Binary proxy route
- Added `proxyGetRaw()` in `src/lib/server/api.ts` that preserves the backend's `Content-Type` and `Content-Length` headers. Buffers the response body to set `Content-Length` explicitly, which PDF viewers require for inline rendering.
- New route `src/routes/api/files/[...id]/+server.ts` proxies to the backend's `/api/files/` endpoint.

### Document viewer
- `+page.svelte` detects PDFs via `file_path.endsWith(".pdf")` and renders an `<iframe>` instead of the markdown renderer.
- "Open in new tab" and "Download" action buttons above the viewer for convenience.
- Responsive CSS for the PDF embed: fills available viewport height (`calc(100vh - 220px)`) with a 500px minimum.

### PDF category
- Added `"pdf"` to the `CATEGORIES` constant and `TreeSource` interface.
- Sidebar file picker: PDFs appear under their own "PDF" category with a distinct icon, instead of being mixed into "Documentation Directory".
- Home page source cards: PDF count in stats row, dedicated PDF section with file list.
- Breadcrumbs and category detail page: PDF files route to "PDF" label instead of "Documentation".
- Doc viewer breadcrumb detects `.pdf` extension for correct category assignment.

## Design decisions

- Used `<iframe>` over `<object>` for PDF embedding. `<object>` is unreliable across browsers; `<iframe>` is universally supported for inline PDF display.
- The `isPdf` check runs before `doc.content` check, so PDFs render correctly even if the backend has stale data from a prior markdown-based ingestion.
- `proxyGetRaw` buffers into `arrayBuffer()` rather than streaming. PDF viewers need `Content-Length` to render, and the proxy can't know the size without buffering. Acceptable trade-off since PDFs are bounded by `MAX_FILE_SIZE` (5MB).
