# SSE Parsing Fix and Streaming Chat Tests

**Date:** 2026-04-07

## Changes

### Fixed SSE parsing for CRLF line endings

The `sse-starlette` library (v3.3.3) sends SSE events with `\r\n` line endings:

```
event: status\r\ndata: {"status":"thinking"}\r\n\r\n
```

The frontend SSE parser split on `\n\n` to separate events, but `\r\n\r\n` does not contain `\n\n` as a substring (the `\r` sits between the two `\n` characters). This caused all events to accumulate in the buffer unparsed, resulting in `Error: Connection lost - no response received`.

**Fix:** Strip `\r` characters from the decoded stream before parsing: `.replace(/\r/g, "")`.

### Exported `parseSSE` for testability

Changed `parseSSE()` from a module-private function to an exported function so it can be unit tested directly.

### Added SSE test suite

New test file `src/lib/sse.test.ts` with 15 tests:

- **parseSSE unit tests** (7): standard events, default event type, multiline data, empty/comment-only input, whitespace trimming, JSON parsing
- **streamChat integration tests** (8): full event dispatch, CRLF handling, chunked streams, error events, connection-lost detection, HTTP errors, request body construction, ping/comment skipping

### Documentation updates

- `docs/development.md`: added SSE streaming section and test file to project structure

## Root cause

The bug was purely a frontend parsing issue. The backend processed chat requests successfully (200 OK, tool calls executed, conversations stored), but the frontend never parsed the SSE events from the response stream.
