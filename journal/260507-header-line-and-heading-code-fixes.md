# Header rule cleanup and heading-code sizing

Two small CSS fixes to the doc viewer.

## Header — stray 1px line under the dark-blue underline

The header band already has a 10px `--brand-dark` `border-bottom` that visually
separates it from the nav strip. The nav's inner `.govuk-service-nav__container`
also had a `border-top: 1px solid var(--brand-surface-border)` — a thin lighter-blue
line that sat in the gap, doing nothing useful (and reading as off-white against
the two adjacent blues). Removed.

## Inline code in markdown headings

`.markdown-content code` pinned `font-size: 13px` for inline code. That works for
body text (17px → 13px is a sensible mono dip), but inside an h1 (32px) the
backticked token shrank to ~40% of the heading size, e.g. an h1 like
``Unit 1a — `api.py` mechanical split`` rendered with `api.py` looking like a
postage stamp glued to the title.

Fix: a heading-scoped override that lets inline code inherit its parent's font
size, with em-based padding so the chip scales with context.

```css
.markdown-content :is(h1, h2, h3, h4, h5, h6) code {
 font-size: inherit;
 padding: 0 0.25em;
}
```

Body inline code is unchanged. Verified end-to-end with the dev server: h1/h2/h3
each carry the code chip at the right size; body code stays at 13px.
