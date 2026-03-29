# Implementation Plan: Fix Document Links in Web UI

## Approach: Custom `marked` Renderer

Use `marked`'s built-in renderer override to rewrite link `href` attributes at parse time. This is the cleanest approach because:

- Links show the correct URL on hover
- Right-click "Copy link" gives the right URL
- Middle-click / Ctrl+click opens the correct document in a new tab
- No runtime click interception needed
- `marked` explicitly supports this via custom renderers

The renderer needs the current document's `source` and `file_path` to resolve relative paths. Both are already available in the component at render time.

## Work Units

### Unit 1: Create link resolution utility (Priority: Critical)

**File:** `src/lib/links.ts` (new)

Create a utility module with two functions:

**`resolveDocLink(href, currentSource, currentFilePath)`**
- Takes a raw `href` from a markdown link, plus the current document's `source` and `file_path`
- Returns the rewritten URL string, or `null` if the link should not be rewritten
- Logic:
  1. If `href` starts with `http://`, `https://`, `mailto:`, or `#` -- return `null` (leave as-is)
  2. Separate any `#fragment` from the path portion
  3. Compute the directory of the current document from `file_path` (e.g., `documentation/shell_environment.md` -> `documentation/`)
  4. Resolve the relative path against that directory (handle `./`, `../`, bare filenames)
  5. Normalize the path (collapse `..` segments, remove `./`)
  6. If the resolved path ends in `.md`: construct doc URL `/doc/${encodeURIComponent(source + ":" + resolvedPath)}`
  7. If it does NOT end in `.md`: construct file URL `/api/files/${encodeURIComponent(source + ":" + resolvedPath)}`
  8. Append `#fragment` if present, and return

**`createDocLinkRenderer(source, filePath)`**
- Returns a `marked` renderer override object with custom `link` and `image` methods
- The `link` method calls `resolveDocLink` and rewrites `href` if it returns a non-null value
- The `image` method resolves relative image `src` attributes to `/api/files/` URLs
- For non-rewritten links, produces a standard `<a>` tag

**Acceptance criteria:**
- External URLs (http/https) pass through unchanged
- Anchor-only links (`#section`) pass through unchanged
- `filename.md` resolves to `/doc/source%3AcurrentDir%2Ffilename.md`
- `./filename.md` resolves the same as bare filename
- `../otherdir/filename.md` resolves correctly relative to current directory
- `filename.md#section` preserves the fragment after the rewritten URL
- Path normalization handles `docs/../docs/file.md` -> `docs/file.md`
- Non-`.md` files resolve to `/api/files/` instead of `/doc/`
- Image sources resolve to `/api/files/`

---

### Unit 2: Integrate renderer into document page (Priority: Critical)

**File:** `src/routes/doc/[id]/+page.svelte`

**Dependencies:** Unit 1

Changes:
- Import `createDocLinkRenderer` from `$lib/links`
- Modify `renderMarkdown()` to accept `source` and `filePath` parameters
- Configure `marked` with the custom renderer when rendering document content
- Pass `doc.source` and `doc.file_path` when calling `renderMarkdown`

Before:
```typescript
function renderMarkdown(content: string): string {
  return marked.parse(content, { async: false }) as string;
}
// Template: {@html renderMarkdown(doc.content)}
```

After:
```typescript
function renderMarkdown(content: string, source: string, filePath: string): string {
  const renderer = createDocLinkRenderer(source, filePath);
  return marked.parse(content, { async: false, renderer }) as string;
}
// Template: {@html renderMarkdown(doc.content, doc.source, doc.file_path)}
```

**Acceptance criteria:**
- Document renders identically except for link hrefs
- Clicking a document link navigates to the correct document within the SPA
- External links still open normally
- Anchor links still work for in-page navigation

---

### Unit 3: Integrate renderer into ChatPanel (Priority: High)

**File:** `src/lib/components/ChatPanel.svelte`

**Dependencies:** Unit 1

The ChatPanel also renders markdown. If it references documents with relative links, those should also resolve.

- If a document is currently being viewed (context available), apply the link renderer using that document's source/path
- If no document context, leave links as-is (no way to resolve relative paths)

**Acceptance criteria:**
- Chat responses render with rewritten links when a document is in context
- Chat responses without document context render links unchanged

---

### Unit 4: Write tests (Priority: High)

**File:** `src/lib/links.test.ts` (new)

**Dependencies:** Unit 1

Test `resolveDocLink` thoroughly:

| Input `href` | Current `source` | Current `file_path` | Expected output |
|---|---|---|---|
| `https://example.com` | any | any | `null` |
| `mailto:a@b.com` | any | any | `null` |
| `#section` | any | any | `null` |
| `file.md` | `repo` | `docs/current.md` | `/doc/repo%3Adocs%2Ffile.md` |
| `./file.md` | `repo` | `docs/current.md` | `/doc/repo%3Adocs%2Ffile.md` |
| `../other/file.md` | `repo` | `docs/sub/current.md` | `/doc/repo%3Adocs%2Fother%2Ffile.md` |
| `file.md#heading` | `repo` | `docs/current.md` | `/doc/repo%3Adocs%2Ffile.md#heading` |
| `sub/file.md` | `repo` | `docs/current.md` | `/doc/repo%3Adocs%2Fsub%2Ffile.md` |
| `image.png` | `repo` | `docs/current.md` | `/api/files/repo%3Adocs%2Fimage.png` |
| `./sub/../file.md` | `repo` | `docs/current.md` | `/doc/repo%3Adocs%2Ffile.md` |

Test `createDocLinkRenderer`:
- Returns object with `link` method
- Produces correct `<a>` tags with rewritten hrefs for relative links
- Produces standard `<a>` tags for external links

---

### Unit 5: Update documentation (Priority: Medium)

**Dependencies:** Units 2, 3

**File:** `CLAUDE.md` -- add a note about the link resolution system under Architecture Decisions:
- Mention that `src/lib/links.ts` handles converting relative markdown links to app URLs
- Note that `.md` links go to `/doc/` and other files go to `/api/files/`

**File:** `docs/` -- update relevant docs if any reference how documents link to each other.

---

## Dependencies

```
Unit 1 (link utility) ─┬─> Unit 2 (doc page integration) ─┬─> Unit 5 (docs)
                        ├─> Unit 3 (chat panel integration) ┘
                        └─> Unit 4 (tests)
```

Units 2, 3, and 4 can all run in parallel once Unit 1 is complete.

## Design Decisions

**Why custom `marked` renderer (not click handler)?**
- Correct URLs on hover, right-click, middle-click all work naturally
- No need to prevent default browser navigation or use `goto()`
- Simpler code -- no DOM event handling
- Works identically for SSR if ever added

**Why resolve at render time (not at ingestion time)?**
- Documents stay "normal" -- no preprocessing in the backend
- Same document can be served to different consumers with different link needs
- No re-ingestion needed if the UI routing changes

**Why not a backend `/api/resolve-link` endpoint?**
- Would require a network request per link, adding latency
- The frontend already has all the information needed (`source` + `file_path`)
- Path resolution is simple string manipulation, no database lookup required

**How are non-`.md` files handled?**
- Relative links to non-markdown files (images, configs, etc.) are rewritten to point to the `/api/files/{docId}` endpoint, which serves the raw file from the backend
- This also covers `![alt](image.png)` image embeds in markdown
