# Navbar Alignment Fix

Fixed the header navbar layout so the three groups are correctly aligned:

1. **Title** ("Documentation Library") flush left
2. **Panel toggles** (Files, Search, Chat) in the middle-right
3. **Utility icons** (dark mode, server status, print) at the far right

## Changes

- Removed `flex: 1` and `justify-content: center` from `.govuk-header__actions-utils` which was causing the utility icons to center in the available space
- Added `justify-content: flex-end` and `gap: 24px` to `.govuk-header__actions` to push both icon groups right with a visible inter-group gap
- Swapped DOM order so panels group comes before utils group (panels are primary controls, utils are secondary)
- Added mobile responsive overrides: inter-group gap reduces to 8px and within-group gaps to 0px at 768px breakpoint

## Verified

- Desktop (1400px): clear separation between icon groups, title flush left, utils flush right
- Mobile (390px): all icons fit without overflow, reduced gaps appropriate for small screens
