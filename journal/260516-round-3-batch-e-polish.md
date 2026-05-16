# 2026-05-16 — Round 3, batch E (polish)

Round 3 opens with the two smallest deferred items from round 2: a one-character
addition to the `displaySource` ACRONYMS set, and a CSS media-query breakpoint
alignment on the home masthead. One PR, two commits.

## What changed

### E1 — `displaySource` ACRONYMS now includes `md`

`src/lib/titles.ts` — added `"md"` to the ACRONYMS Set. `claude-md-global` now
renders as "Claude MD Global" everywhere `displaySource` is used: home table,
breadcrumbs, doc viewer source label, /status table, /bookmarks group headers,
SearchPanel, ChatPanel history.

Two assertions added to `src/lib/titles.test.ts`:
- `displaySource("claude-md-global")` → "Claude MD Global"
- `displaySource("md-formatter")` → "MD Formatter"

Both start-of-word and middle-of-word positions are exercised.

### E2 — Home masthead breakpoint aligned to layout's 768px

`src/routes/+page.svelte` — the masthead had three `@media (min-width: 641px)`
blocks and one `@media (max-width: 640px)` block. The layout's `.content`
padding switches at `max-width: 768px`. Between 641–767px the masthead's
negative-margin bleed overshot the content padding by 15px each side, silently
clipped by `overflow-x: hidden`.

Shifted all four masthead breakpoints to 767px / 768px so they switch in
lock-step with the layout's content breakpoint. Side-effect: the existing
mobile rules at the same breakpoint (source-table padding shrink, .col-date
hide, .time-ago hide) moved with them. That co-location was already there;
this batch preserved it.

## Verification

- `npm test`: 254 passed across 15 test files.
- `npm run check`: clean.
- `npm run lint`: clean.
- Visual at 500 / 700 / 800 / 1440 px, light + dark — masthead bleeds correctly
  at every viewport. (Visual verification performed by the controller after
  this commit lands.)

## Out of scope (round 3 follow-ups for later batches)

This was the polish batch. Subsequent round-3 batches:

- **A** (a11y, next): focus-visible audit, ChatPanel `.history-title`
  nested-interactive fix, /status aria-describedby, ChatPanel aria-live,
  FloatingDocControls 30 → 44px.
- **D** (XSS hardening): DOMPurify across both `{@html}` surfaces.
- **B** (density/layout): /status, home, doc viewer.
- **C** (state): /status URL sort params + visibility-paused polling.

See `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md`
for the full round-3 plan.
