# Chat Clear Confirmation & Sidebar Font Size

## Chat Panel Improvements

The "clear chat" button was positioned right next to the "maximize chat" button, making accidental
clicks likely. Three changes address this:

1. **Confirmation step** — Clicking the trash icon now shows an inline "Clear?" prompt with
   checkmark (confirm) and X (cancel) buttons instead of immediately clearing.

2. **localStorage persistence** — Chat messages are saved to `localStorage` automatically via a
   Svelte 5 `$effect` that tracks `messages.length`. Messages survive page refreshes.

3. **Restore previous chat** — When chat is cleared, the previous conversation is saved to a
   separate `localStorage` key. An undo/restore button (circular arrow icon) appears in the
   empty state to reload the last cleared conversation.

### Reactivity fix during code review

The initial `$effect` used `if (messages)` to trigger saves, which only tracks the reference —
not mutations via `.push()`. Changed to `void messages.length` which reads the reactive proxy's
length property, correctly triggering the effect on push/splice operations.

### SSR fix

`localStorage` calls at component init time crashed server-side rendering (SvelteKit runs
components on the server). Fixed by importing `browser` from `$app/environment` and gating
all localStorage access inside `$effect` blocks that early-return when `!browser`. State
initializes with empty defaults for the server pass.

A hydration guard (`hydrated` flag) prevents the save effect from overwriting stored data
with `[]` before the load effect runs on mount.

### Restore button discoverability

Added a prominent "Restore previous chat" button in the empty state area (center of the chat
panel) in addition to the small icon in the header, making it much easier to find.

### Markdown rendering in chat

Replaced the hand-rolled `formatContent` function (only handled bold, inline code, and newlines)
with `marked.parse()` — the same library already used by the doc page viewer. Added the global
`markdown-content` class to assistant message bubbles, with scoped `:global()` CSS overrides to
keep margins and spacing compact for chat context (headings, lists, code blocks, blockquotes).

## Duplicate CI/CD workflow

Found two workflows (`build-and-push.yml` and `docker-publish.yml`) both triggering on push to
main and pushing Docker images to ghcr.io. Deleted `docker-publish.yml`. Updated the `/done`
skill to prevent this — Phase 1 now requires reading all workflow file contents (not checking
for a specific filename) and includes explicit duplicate consolidation instructions.

## Sidebar Font Size

Increased font sizes across the sidebar for better readability:

| Element          | Before   | After    |
|------------------|----------|----------|
| Document names   | 0.82rem  | 0.9rem   |
| Source names     | 0.85rem  | 0.9rem   |
| Category labels  | 0.8rem   | 0.85rem  |
| Source tags      | 0.72rem  | 0.8rem   |
