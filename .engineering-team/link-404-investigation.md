# Document Link 404 Investigation

**Date:** 2026-03-30
**Status:** Investigation complete, plan ready for review

## Problem

When viewing a document in the web UI, links within the document content that point to other documents produce 404 errors. These are relative markdown links designed to work on GitHub and locally.

## Root Cause

The rendering pipeline has no link transformation:

1. **Raw markdown stored as-is** -- The MCP server stores document content verbatim from the source files. No link processing during ingestion (`ingestion.py:602` -- `file_path.read_text()`).

2. **`marked` renders links literally** -- The frontend uses `marked.parse()` with default options and no custom renderer (`+page.svelte:43-44`). A markdown link like `[Ansible Build Commands](ansible_build_commands.md)` becomes `<a href="ansible_build_commands.md">`.

3. **Browser resolves relative to the current URL** -- When viewing a document at `/doc/proxmox-setup%3Adocumentation%2Fshell_environment.md`, the browser resolves `ansible_build_commands.md` as a relative URL. Depending on browser behavior, this resolves to something like `/doc/ansible_build_commands.md` or `/ansible_build_commands.md`, neither of which matches any SvelteKit route.

4. **No link interception exists** -- There is no click handler, no `marked` renderer plugin, and no HTML post-processing anywhere in the codebase.

## Key Architecture Facts

| Aspect | Detail |
|--------|--------|
| Document ID format | `source:relative/file/path` (e.g., `proxmox-setup:documentation/shell_environment.md`) |
| App URL format | `/doc/{encodeURIComponent(docId)}` |
| Markdown renderer | `marked` v17.0.5, default config |
| Render location | `src/routes/doc/[id]/+page.svelte:125` |
| Also renders markdown | `src/lib/components/ChatPanel.svelte:134` |
| Sidebar link helper | `Sidebar.svelte:64` -- `docUrl()` returns `/doc/${encodeURIComponent(docId)}` |
| Document data available | `doc.source`, `doc.file_path`, `doc.doc_id` all available at render time |

## Example

**Source document:** `proxmox-setup:documentation/shell_environment.md`
**Markdown link:** `[Ansible Build Commands](ansible_build_commands.md)`

- **On GitHub:** Works -- GitHub resolves `ansible_build_commands.md` relative to the current file's directory.
- **Locally:** Works -- file system resolves it relative to the current file.
- **In web UI:** Broken -- browser resolves it relative to the URL `/doc/...`, producing a 404.

**Expected resolution:**
- Target doc_id: `proxmox-setup:documentation/ansible_build_commands.md`
- Target URL: `/doc/proxmox-setup%3Adocumentation%2Fansible_build_commands.md`

## Link Patterns Found in Documents

From scanning `/Users/john/projects/home-server/proxmox-setup/documentation/`:

- **Same-directory, bare filename:** `[text](filename.md)` -- most common
- **Same-directory with `./`:** `[text](./filename.md)` -- occasionally used
- **Parent directory:** `[text](../other-dir/filename.md)` -- for cross-directory references
- **Anchor links:** `[text](#section-heading)` -- internal to current doc, should be left alone
- **External URLs:** `[text](https://example.com)` -- should be left alone

## Solution Requirements

1. Links between documents must work in the web UI
2. The original markdown files must remain unchanged (keep working on GitHub and locally)
3. All link transformation must happen at render time in the frontend
4. External URLs and anchor links must not be affected
5. Solution should handle the ChatPanel markdown rendering too
