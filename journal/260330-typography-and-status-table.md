# Typography Scaling and Status Table Fixes

## Hero Text Simplification

Simplified masthead descriptions across three pages (Journal, Root Docs, Engineering Team)
from dynamic project/document counts to concise static text. Reformatted README.md and
docs/architecture.md for consistent line wrapping.

## Status Table Improvements

- Default sort changed to "Last Indexed" descending (most recent first) — previously
  defaulted to alphabetical by source name
- Numeric columns (Files, Chunks) now use `width: 1%; white-space: nowrap` to shrink to
  content instead of claiming proportional space
- Removed `width: 100%` from the table to eliminate the large blank area in the last column
  that extended to the page edge
- Added `white-space: nowrap` to timestamp spans for correct column sizing
- Kept Last Indexed column left-aligned (timestamps are text, not numbers — right-alignment
  is reserved for numeric data where digit alignment matters)

## Desktop Font Size Reduction

Adjusted default typography so the site reads comfortably at 100% browser zoom on a laptop:

| Element | Before | After | Rationale |
| --- | --- | --- | --- |
| Body / content | 19px | 17px | Match previous 90% zoom feel |
| Headings (h1/h2/h3) | 36/24/19px | 32/21.6/17px | Proportional 90% scale |
| Markdown tables | 19px | 15px | Match previous 80% zoom feel |
| Code blocks | 16px | 13px | Match previous 80% zoom feel |
| Table cell padding | 10px 20px | 8px 16px | Proportional to table font |

Mobile sizes (16px base) unchanged — the 19px desktop default was the outlier.

## Lint Fix

Removed unused `sidebarPanel` selector from `e2e/panel-switching.test.ts` (pre-existing).
