# 2026-05-18 — Round 4, batch 2 (hardening)

Round 4's small hardening batch. Four items, all small, mechanically
independent. Lays groundwork for future tightening rather than
shipping user-visible features.

Round-4 plan: `.engineering-team/improvement-plan.md` (W2–W5).

## What shipped

**W2 — CSP headers from the SvelteKit Node server.** New
`src/lib/server/csp.ts` exports `buildCspHeader()`, returning a
single CSP header string. `src/hooks.server.ts` sets the header on
every response that doesn't already carry one (per-route overrides
still possible). First-pass policy is deliberately permissive —
`'unsafe-inline'` on `script-src` and `style-src` because SvelteKit
hydration uses inline bootstrap scripts and Svelte component scoped
styles render as inline `<style>` blocks. Tight where it matters:
`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
`form-action 'self'`. Defence-in-depth on top of DOMPurify
(round-3 D1). Unit tests in `src/lib/server/csp.test.ts` lock the
directive shape (8 cases).

**W3 — role="status" on `/status` overall-health badge.** One
attribute on `src/routes/status/+page.svelte`'s outer
`.status-badge` div. The per-row badges keep their existing
semantics (they live inside a table with `<th scope="col">Status</th>`
and don't need a redundant role). Verified live: VO will now
announce the badge as a status region instead of a generic div.

**W4 — `buildSortQuery` test for `last_indexed asc`.** One new
test in `src/routes/status/page-logic.test.ts` covering
`{ key: "last_indexed", asc: true }` — the default key with a
flipped direction. Logic is correct (`?sort=last_indexed&dir=asc`);
the test locks the URL shape against a future refactor of
`DEFAULT_SORT` that might drop the redundant key.

**W5 — Vitest coverage tool setup.** `@vitest/coverage-v8` added as
a devDependency. `vite.config.ts` gains a `coverage` block (provider
`'v8'`, reporters `['text', 'html']`, output to `coverage/`).
`package.json` gains a `test:coverage` script. `coverage/` was
already gitignored. ESLint config now also ignores it (the v8
provider writes a `block-navigation.js` file that flunks a
no-unused-disable-directive check). No thresholds set yet —
visibility only.

## Files touched

- `src/hooks.server.ts` — wired CSP header into the existing
  `handle` hook.
- `src/lib/server/csp.ts` — new module: `buildCspHeader()`.
- `src/lib/server/csp.test.ts` — new test file (8 cases).
- `src/routes/status/+page.svelte` — `role="status"` on the
  overall-health badge.
- `src/routes/status/page-logic.test.ts` — new test case for the
  default-key flipped-direction URL.
- `package.json` — `test:coverage` script, `@vitest/coverage-v8`
  devDep.
- `vite.config.ts` — coverage block.
- `eslint.config.js` — added `coverage/` to ignores.
- `docs/architecture.md` — new "Content-Security-Policy" subsection
  under XSS hardening, documenting the policy rationale.
- `docs/development.md` — `npm run test:coverage` documented.

## Verification

CSP header at runtime against `localhost:5173`:

```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';
  connect-src 'self'; frame-src 'self'; frame-ancestors 'none';
  base-uri 'self'; form-action 'self'; object-src 'none'
```

Confirmed identical on `/`, `/status`, `/doc/<anything>` via `curl -sI`.

Playwright run against `/` and `/status` with backend on
`DOCSERVER_DATA_DIR=/tmp/docserver-data`:

- 0 console errors / 0 warnings on both routes — CSP isn't blocking
  any current loads.
- `document.querySelector('.status-badge').getAttribute('role')`
  returns `"status"`. `aria-describedby` still points at
  `status-desc-healthy` (or the relevant id).

Test count: 284 → 293 (+8 CSP, +1 buildSortQuery). All gates clean:
`npm run check`, `npm run lint`, `npm test`, `npm run build`,
`npm audit` (0 vulnerabilities, carried over from W1).

## Branch / merge

- Branch: `eng-round-4-batch-2-hardening`
- Merge: `git merge --no-ff` to `main`.

## Follow-ups (for round 5+)

- CSP nonce-based tightening for `script-src` and `style-src` (drop
  `'unsafe-inline'`). Requires a nonce generator in the hook plus
  per-request nonce injection into Svelte-rendered tags — non-trivial
  but the single biggest remaining hole.
- Coverage thresholds. Once the surface stabilises and gaps are
  triaged, set baseline thresholds and add a CI gate.
