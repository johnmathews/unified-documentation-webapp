# 260519 — Fast local-dev: document backend no-ingest flags

## Context

Spinning up the app locally to test the webapp made the laptop hot and slow.
Triage (engineering-team) traced it entirely to the backend, not the webapp:
`npm run dev` is a plain `vite dev` and idles cheaply; the cost was the
docserver running a full ingestion cycle (embedding-model load + git-fetch of
all configured repos + re-embed of changed docs) on every startup and every
poll interval.

## Webapp-side change

No code change here — the fix is backend-side (new `DOCSERVER_POLL_INTERVAL=0`
+ `DOCSERVER_INGEST_ON_START=0` "serve the persisted corpus, never auto-
ingest" mode; see `unified-documentation-server` journal
`260519-fast-local-dev-no-ingest.md`).

Docs only:

- `docs/development.md`: added a **Fast path for UI work** block to the
  "Start the backend" step with the recommended env-flag invocation and a
  note that `/rescan` still refreshes on demand.
- `CLAUDE.md`: one line in *Backend Dependency* pointing at the fast-path
  flags so future sessions start the backend cheaply for UI work.

## Why this matters for the webapp

The webapp has no mock data layer — every local UI test needs a live backend.
Making the backend cheap to run locally directly removes friction from the
standard `npm run dev` + local docserver loop without changing any frontend
behaviour.

Cross-ref: `unified-documentation-server` commit on the same date implements
the flags and supervisor mode logic.
