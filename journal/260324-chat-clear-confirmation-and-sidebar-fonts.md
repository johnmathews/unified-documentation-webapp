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

## Sidebar Font Size

Increased font sizes across the sidebar for better readability:

| Element          | Before   | After    |
|------------------|----------|----------|
| Document names   | 0.82rem  | 0.9rem   |
| Source names     | 0.85rem  | 0.9rem   |
| Category labels  | 0.8rem   | 0.85rem  |
| Source tags      | 0.72rem  | 0.8rem   |
