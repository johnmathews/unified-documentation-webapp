# 2026-05-16 — Round 3, batch D (XSS hardening)

Round 3 batch D closes the deferred XSS-hardening item from round 2:
install DOMPurify and wrap both `{@html}` render paths so untrusted
markdown can never inject script execution. Four commits — install,
sanitiser module + tests, ChatPanel wire, links.ts wire — plus this
entry.

## What shipped

### Install isomorphic-dompurify

`package.json`. The SSR-friendly variant bundles `jsdom` for the
server renderer and uses the browser's DOMParser in the client
bundle. The doc viewer's body is server-rendered via SvelteKit; the
non-isomorphic `dompurify` package would have thrown during SSR.

### New module: `src/lib/sanitise.ts`

`sanitiseHtml(dirty: string): string` wraps DOMPurify with a single
shared allowlist:

- **Tags:** the standard markdown tags marked emits, plus `<mark>`
  for future highlight support: h1-h6, p, br, hr, em, strong, del,
  code, pre, blockquote, ul, ol, li, a, img, the table family, mark,
  span, div.
- **Attributes:** href, src, alt, title, id, class.
- **URI scheme allowlist:** http(s), mailto, tel, and same-origin
  (`/`), fragment (`#`), and query-only (`?`) refs. javascript:,
  data:, and vbscript: are denied by exclusion.

16 unit tests in `src/lib/sanitise.test.ts` cover the strip side
(script, event handlers, javascript: URIs, iframe, style, javascript:
in style) and the preserve side (headings, paragraphs, emphasis,
lists, blockquote, hr/br, tables, pre/code, mark, images, safe-href
links). Edge cases: empty input, plain text, idempotence.

### ChatPanel render wraps both paths

`src/lib/components/ChatPanel.svelte`. `renderMarkdown` had two
return paths — link-rewrite via `renderMarkdownWithLinks`, and plain
`marked.parse`. Both now pipe through `sanitiseHtml`. Assistant
replies can no longer execute injected script even if a backend or
model emits raw HTML.

### links.ts internalises sanitisation

`src/lib/links.ts`. `renderMarkdownWithLinks` wraps its marked-
rendered + link-rewritten HTML in `sanitiseHtml` before returning.
Any caller — currently the doc viewer's `{@html}` at line 150 of
`/doc/[id]/+page.svelte`, potentially others later — gets
sanitisation by default without changing the call site.

ChatPanel's outer `sanitiseHtml` wrap on the link-rewrite path is now
a double-sanitise. DOMPurify is idempotent (covered by a unit test),
so the cost is negligible and the defence-in-depth is intentional —
future refactors that change one path's wrapping can't accidentally
open a hole.

## Verification

- `npm test`: 270 passed across 16 test files (254 baseline + 16 new
  sanitise tests).
- `npm run check`: clean.
- `npm run lint`: clean.
- `npm run build`: smoke-tested for SSR compatibility by the
  controller before merging.

## Out of scope (round 4 candidates)

- **Backend `<mark>` highlighting in search snippets** — cross-repo
  change (server + webapp). The sanitiser's allowlist already
  includes `<mark>`, so the webapp side is ready when the backend
  starts emitting them.
- **CSP headers** — sanitiser is in-app defence. A real Content-
  Security-Policy header (delivered by the SvelteKit Node server)
  would add a second layer. Round-4 candidate.

See `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md`
for the full round-3 plan.
