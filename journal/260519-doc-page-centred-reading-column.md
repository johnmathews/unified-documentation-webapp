# 260519 — Re-centre the doc-page reading column + drop redundant doc-type

## Context

Two small follow-ups to the same-day full-bleed layout decision
([`260519-full-bleed-layout-decision.md`](260519-full-bleed-layout-decision.md)):

1. On wide desktop displays the doc reading column was pushed hard against
   the left edge of the content area. `.doc-layout` used `max-width: 900px;
   margin: 0` so it sat at the shared 30px inset, but with no TOC rail the
   space to its right ran to the full viewport — visually it read as
   "abandoned" rather than "left-aligned on purpose". The home page and the
   journal page both centre a 960px column inside their full-bleed bands
   and look natural on the same monitor, which the user pointed to as the
   reference.
2. The doc page's `.doc-meta` line repeated the document type
   ("Documentation", "Journal") in bold after the file path. Breadcrumbs
   already convey this — the second-or-third crumb is the corresponding
   path segment (`journal`, `docs`, `docs › adr`) — so the meta-line badge
   was redundant chrome rather than information.

## Decisions

**1 — Centre the doc reading column.** `.doc-layout` changed from
`margin: 0` back to `margin: 0 auto`. `max-width: 900px` is unchanged, and
the `.doc-layout.has-toc` desktop branch (`max-width: 1000px`,
`grid-template-columns: minmax(0, 720px) 240px`) inherits the centring with
no extra rule of its own. The sticky `.doc-header` keeps working — sticky
positioning is relative to the scroll container, not the centred column's
own box.

This re-opens the divergence from the prior same-day decision: that
decision optimised for *one shared left edge* across header band, nav
band, chat page, and doc column. In practice the doc column reads
differently from the chat page — chat *uses* its width (messages, input,
sidebar), the doc column *bounds* its width for prose measure — and the
shared-left-edge rhythm was only ever visible if you noticed the 30px
inset, while the abandoned-right-margin was the first thing to notice on a
wide monitor. Header and nav bands stay full-bleed; only the reading
column re-centres.

**2 — Drop the `.doc-type` badge.** Removed both the span and its CSS rule
from `src/routes/doc/[id]/+page.svelte`. The `doc.type` value is still
delivered by the backend and still drives SearchPanel's filters; this
change only removes the per-page redundant display.

## Files touched

- `src/routes/doc/[id]/+page.svelte` — `.doc-layout` margin `0` → `0 auto`
  with comment refreshed; removed the `{#if doc.type}` span + separator
  from `.doc-meta`; removed the `.doc-type` CSS rule.
- `CLAUDE.md` — reframed the "doc column is left-aligned" line to "reading
  columns are centred"; pointer to this journal entry alongside the
  earlier one.

## Verification

- `npm run lint` — clean.
- `npm test` — 325/325 pass (no test asserted against `.doc-type` or
  `.doc-layout`'s margin; the print-css test only mentions a long-removed
  `.doc-meta-row` class).
- **Not** browser-verified in this session — runtime CSS change. Eyeball
  on a wide monitor with the local stack (`uv run python -m docserver`
  with the fast-path flags, then `npm run dev`) before release; the
  expected outcome is that the doc page mirrors the home/journal pages'
  centred-960px feel and the meta line no longer carries the redundant
  type badge.
