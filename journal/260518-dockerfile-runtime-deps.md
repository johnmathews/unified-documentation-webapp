# 2026-05-18 — Dockerfile runtime deps: install from lockfile

Production hotfix. The Dockerfile's runtime stage was hand-installing
only `marked` via `RUN npm install --no-save marked`, dating back to
when that was the sole runtime dep beyond `@sveltejs/adapter-node`.
Round-4 batch-2's XSS hardening added `isomorphic-dompurify` to
`package.json` dependencies, but nobody touched the Dockerfile. The
deployed image built and pushed cleanly, then crashed on every request
with:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'isomorphic-dompurify'
  imported from /app/build/server/chunks/_layout.svelte-*.js
```

Local `npm run dev` / `vite preview` worked fine — they have the full
`node_modules` from `npm ci` in stage 1. The bug only manifested in the
slim runtime stage.

## Fix

Replace the hand-list with a real production install:

```diff
 FROM node:22-slim
 WORKDIR /app
 COPY --from=builder /app/build ./build
-RUN npm install --no-save marked
+COPY package.json package-lock.json ./
+RUN npm ci --omit=dev
```

Future runtime deps now ship automatically with no Dockerfile edit
needed. Versions are pinned by the lockfile.

Verified by building the image and running it locally — `GET /` returns
200 with no module-resolution errors in the container logs.

## Note for future Dockerfile reviewers

If you find yourself writing `RUN npm install --no-save <pkg>` in a
runtime stage, stop. The lockfile is the source of truth — copy it in
and use `npm ci --omit=dev`. Hand-listing packages is a foot-gun every
time a new runtime dep gets added.
