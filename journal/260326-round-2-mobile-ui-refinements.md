# Round 2 Mobile UI Refinements

## What changed

Six targeted UI improvements based on user testing on mobile devices:

1. **File picker font sizes bumped** — search input, tree items, and header label all increased by ~0.05rem for better readability.

2. **Sidebar closed by default on mobile** — added `onMount` guard that closes the sidebar drawer when `isMobile` is true, so the home page content is visible on first load.

3. **Home page card spacing reduced on mobile** — doc list items in source cards had excessive vertical padding (0.5rem + 44px min-height). Reduced to 0.2rem padding and 36px min-height for more natural density.

4. **"Documentation" title clickable when drawer is open** — header z-index raised from 10 to 101 (above sidebar at 100 and backdrop at 99), ensuring the title link is always interactive.

5. **Navbar sizing improved** — header height increased to 56px, title font bumped to 1.25rem/700, icon buttons given visible borders and slightly larger SVGs (18-20px). The navbar now reads as a proper app header rather than a subtle toolbar.

6. **Expand/collapse controls redesigned** — replaced the unintuitive fullscreen-style icon button with inline text: "expand all | collapse all" next to the "Documents" label. Uses smaller font size to maintain visual hierarchy.

## Decisions

- Used `onMount` rather than conditional `$state` initialization for the mobile sidebar default, since `MediaQuery` may not be accurate during SSR.
- Kept touch target sizes at 44px minimum in the sidebar (WCAG compliance) while reducing home page card items to 36px since those are denser list content.
- Header z-index set to 101 rather than restructuring the DOM stacking — simpler fix for the pointer-events issue.
