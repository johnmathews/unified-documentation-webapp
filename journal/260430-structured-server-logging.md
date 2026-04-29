# Structured server logging for the webapp

The webapp container was effectively silent in production. The only visible logs were from the backend
(`documentation-server`); when something went wrong on the SvelteKit side — a proxy fetch failed, a route 500'd, the
backend went away — the only signal was a `502 Backend unavailable` body returned to the browser, with no clue why.
The `proxyGet`/`proxyPost`/etc. helpers in `src/lib/server/api.ts` were swallowing exceptions inside `catch {}` blocks
without ever surfacing them.

## What the webapp now emits

A structured JSON logger lives in `src/lib/server/logger.ts`. It writes one line per event to stdout (errors to
stderr) using the same shape the backend uses: `timestamp`, `level`, `logger: "docwebapp"`, `message`, `event`, plus
event-specific fields. That makes the two log streams aggregate cleanly when read together.

`src/hooks.server.ts` wires the logger into SvelteKit:

- `server_start` once on boot — captures `api_url`, `node_env`, `port`. Useful for confirming the right backend got
  picked up after a deploy.
- `request_done` for every browser request — `request_id`, `method`, `path`, `status`, `duration_ms`. Severity scales
  with status (info/warn/error for 2xx/4xx/5xx).
- `server_error` (via `handleError` hook) for unhandled exceptions, with stack.

A short base36 counter (`newRequestId()`) is generated per request, stored on `event.locals.requestId`, and included
in every log line for that request, so a single user action can be traced through the request log and any errors it
produces.

The proxy helpers in `src/lib/server/api.ts` now also log:

- `upstream_call` for every backend hit — `method`, `upstream_path`, `upstream_status`, `duration_ms`. Escalates to
  `warn` for 4xx or `duration_ms ≥ 1000` (slow-call signal), `error` for 5xx.
- `upstream_error` when the proxy fetch throws — covers backend down, DNS failure, 90s POST timeout — with the
  underlying exception message. This is the big visibility win; previously these were silent.

## Design choices

**Why JSON, not pino/winston.** The whole logger is ~25 lines and matches the backend shape exactly. Adding a
dependency for this would be more code, not less, and the backend-shape compatibility was a hard requirement that
off-the-shelf loggers don't satisfy out of the box.

**Why a counter for request id rather than a UUID.** Logs are read by humans first, machines second. Four base36
chars are easier to scan than a 36-char UUID, and per-process uniqueness is all we need — nothing correlates request
ids across container restarts.

**Removed the try/catch around `resolve()` in `handle`.** First version wrapped `resolve()` in a try/catch to log a
`request_error` before re-throwing. But SvelteKit's `resolve()` always returns a Response (internal errors are caught
and rendered as the error page), and anything that does escape the handle hook lands in `handleError` — which already
logs `server_error`. Defensive code for a path that can't fire.

**Errors to stderr, everything else to stdout.** Conventional, and lets log routers (or `docker logs`) split severities
without parsing JSON. Slow calls go to stdout at `warn` because stderr is for things that broke, not things that were
sluggish.

## Incidental cleanup

Adding `process.stdout.write` and `performance.now()` triggered TypeScript errors that revealed `@types/node` was
never installed. Adding it as a devDep also cleared up pre-existing errors in `src/lib/print-css.test.ts` (`fs`,
`path`, `__dirname` were untyped — `npm run check` had been reporting 7 errors before this change; it now reports 0).

## Tests

Eight new unit tests in `src/lib/server/logger.test.ts` cover the routing rules (info/warn → stdout, error → stderr),
JSON shape, newline termination, and request-id properties (uniqueness, base36, padded length). Total suite went from
196 → 204 tests, all passing.
