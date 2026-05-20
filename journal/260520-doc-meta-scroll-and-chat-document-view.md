# 260520 — doc-meta scrolls; chat becomes a document view; ⌘B for Files

Three small UI fixes driven directly off user feedback in one session — no
engineering-team run, no plan doc, just inline edits with Playwright
verification at the end.

## 1. doc-meta scrolls off the top

`/doc/{id}` had the metadata row (bookmark · source / file-path · modified
· word count · "View on GitHub") inside the sticky `.doc-header`, so it
was pinned at the top of the viewport forever. The user wanted it to
behave like normal flow content and scroll off.

Move the `<div class="doc-meta">` out of `<header class="doc-header">`
so it's a sibling that scrolls with the body. Breadcrumbs + title are
still sticky (titleHidden logic unaffected). CSS spacing reflows
slightly: `.doc-header` margin-bottom 30→15px, `.doc-meta` gets
`margin-bottom: 30px` so the distance from header-section to body text
ends up the same as before.

## 2. Files shortcut: ⌘\ → ⌘B (revert)

`⌘\` was chosen in fix-batch-7 because `⌘B` was deemed unintuitive and
`⌘F` would clobber browser find-in-page. In practice `⌘\` is
intercepted by the OS / browser before the page handler runs, so it
silently doesn't work. Back to `⌘B` (the original) and `⌘F` stays
untouched. Updated the keydown handler in `+layout.svelte`, the modal
listing, the modal test, and the CLAUDE.md rationale note (kept the
"leave ⌘F alone" reason, recorded the ⌘\ revert).

## 3. Chat page: document view, focus on mount, refocus after send

User's three-part request against `/chat`:

- **Auto-focus the input on page load.** Added `onMount(() =>
  textareaEl?.focus())` in `ChatPanel.svelte`.
- **Keep focus after sending.** `handleSubmit`'s `finally` now does
  `await tick(); textareaEl?.focus()` — the textarea is `disabled`
  while sending, so it has to re-enable before focus takes.
- **Bubble layout → document view.** Reference screenshot from another
  app showed a linear vertical layout with "YOU" / "AGENT" uppercase
  labels above each message, no bubbles, no left/right alignment, just
  a centred reading column. Replaced `.message-bubble` with two parts
  per message: a `.message-role` label (13px, uppercase, brand blue)
  and a `.message-body` containing the text/markdown. User bodies get a
  light `--accent-dim` tint + 10/15 padding; assistant bodies are
  plain. The messages container caps each row at 900px and centres
  them. Bubble-specific class names (`.message-bubble`) are gone — all
  the `:global(p)` / `:global(h1)` etc. margins moved to
  `.message-body`. Edit button is absolutely positioned top-right of
  the message row (replaces the row-level flex alignment trick).

## Verification

Local backend (`DOCSERVER_INGEST_ON_START=0 DOCSERVER_POLL_INTERVAL=0`)
+ `npm run dev` + Playwright:

- `/chat` mount: `document.activeElement === textarea` ✓
- After sending: `focused: true, disabled: false` once the reply lands ✓
- DOM: two messages with `.message-role` = "You" / "Agent" and
  `.message-body` carrying the content ✓
- `/doc/SRE-agent:readme.md` scrolled inside `main.content` to y=800:
  breadcrumbs + title still pinned, doc-meta gone ✓

`npm run lint` clean, `vitest run` 325/325 passing.
