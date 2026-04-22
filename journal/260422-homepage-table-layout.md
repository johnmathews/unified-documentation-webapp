# Homepage table layout improvements

Adjusted the homepage project table to give columns more breathing room on
wide displays while keeping the GOV.UK design conventions intact.

## Changes

- `.home` container max-width reduced from 960px to 880px (table was too wide
  at 1100px after initial attempt, settled on 880px as a good middle ground)
- `.source-table` now sets `width: 100%` so the table fills its container
  instead of shrinking to content width
- Column cell padding increased from 20px to 28px for more spacing between
  columns
- Documents column (`col-count`) padding-right set to 0 since it's the last
  column — no trailing whitespace needed. Right-alignment preserved per GOV.UK
  numeric column guidelines.

## Also fixed

- Pre-existing test failure in `stores.test.ts` — the CATEGORIES count and key
  list were stale (expected 7 categories, actual is 9 after `skills` and
  `runbooks` were added).
