# 2026-05-16 — Round 3, batch A (accessibility)

Round 3 batch A closes the five accessibility items deferred from round 2:
ChatPanel history-row nested-interactive refactor, focus-visible audit,
/status aria-describedby, ChatPanel aria-live, and FloatingDocControls
touch-target floor. Five item commits + this entry on the same branch.

## What shipped

### A1 — ChatPanel `.history-item` → real button wrapper

`src/lib/components/ChatPanel.svelte` — conversation rows in the history
view were a `<div role="button" tabindex="0">` wrapping a nested real
`<button>` for delete. Keyboard users had no per-row focus stop other
than delete; screen readers read titles as plain text. Refactor: each
row is now a flex `.history-item-wrapper` containing two sibling real
`<button type="button">` elements — `.history-row` (resume) and
`.history-delete` (delete). The delete button gets a real
`aria-label="Delete conversation: {title}"`; its svg is `aria-hidden`.

### A2 — Focus-state audit: 4 duplicates removed, 13 refinements documented

`src/app.css` + 7 component/route files. Two canonical focus patterns
are now documented at the top of `:focus-visible` in app.css: GOV.UK
yellow-fill for `a:focus`, 3px outline for `:focus-visible`. Per-
component rules either removed (pure duplicates) or kept with a one-
line comment naming what they refine or why they diverge.

Removed (4):
- `SearchPanel.svelte` — `.filter-toggle:focus` (pure duplicate).
- `Breadcrumbs.svelte` — `.govuk-breadcrumbs__link:focus` (exact
  match to canonical `a:focus`; cascade takes over).
- `journal/+page.svelte` — `.entry-title:focus` (anchor; same).
- `+page.svelte` — `.source-link:focus` (anchor; same).

Documented refinements (7): SearchPanel inputs that need an inset
border so the outline doesn't collide with the input border;
SearchPanel/home/journal small button-styled controls that need
GOV.UK yellow-fill rather than just the outline.

Documented divergences (3): Toaster `.toast__close` on dark surface;
layout's `.govuk-header__link--homepage`, `.govuk-header__action-btn`,
and `.govuk-service-nav__link` on coloured header/nav bands. All
keep their colour-swap focus styling because the standard pattern
would either be invisible (dark surface) or clash (coloured band).

### A3 — `/status` aria-describedby

`src/routes/status/+page.svelte`. Status badges relied on colour +
`title=` for meaning. Added a visually-hidden `<dl>` describing each
status value once (`healthy`, `degraded`, `error`, `warning`,
`unknown`), and `aria-describedby` on every badge (overall + per-row)
pointing at the matching `<dt>`. The `title=` attribute stays for
sighted hover users; the `.visually-hidden` utility class lives in
the route's `<style>` block.

### A4 — ChatPanel `.messages` is an aria-live region

`src/lib/components/ChatPanel.svelte`. One-line attribute addition:
`aria-live="polite" aria-relevant="additions" aria-atomic="false"` on
the `.messages` container. Screen readers now announce new assistant
messages and tool-progress steps as they're appended, without
interrupting the current utterance and without re-announcing the
whole message list on every change.

### A5 — FloatingDocControls 30 → 44px

`src/lib/components/FloatingDocControls.svelte`. The floating
controls' `.control-btn` rule moves from 30px to 44px square (WCAG
touch-target floor), with `min-width`/`min-height` pinned so the
buttons can't shrink under flex pressure. The 16px svg stays
centred via flexbox.

## Verification

- `npm test`: 254 passed across 15 test files. No regression.
- `npm run check`: clean.
- `npm run lint`: clean.
- Visual + keyboard Tab-walk: performed by the controller at batch-end
  via Playwright. VoiceOver checks for A3 and A4 are deferred to a
  manual VO pass after this batch merges to main.

## Out of scope (round 3 follow-ups)

After batch A merges, the round-3 batches still to land are:

- **D** (XSS hardening): DOMPurify wrap on both `{@html}` render
  paths (ChatPanel assistant messages and `/doc/[id]` document body).
- **B** (density/layout): mockup-first pass on `/status`, home `/`,
  and doc viewer. Pre-plan at
  `docs/superpowers/plans/2026-05-16-round-3-batch-b-density.md`.
- **C** (state): `/status` sort state in URL + visibility-paused
  polling refresh.

The same masthead negative-margin breakpoint bug that batch E fixed
on the home page also exists on `/status` (same `@media (min-width:
641px)` blocks at `status/+page.svelte:251, 271, 285, 292`). That
will be folded into batch B1.

See `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md`
for the full round-3 plan.
