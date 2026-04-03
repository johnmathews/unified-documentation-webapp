# Rename and add columns on status page

**Date:** 2026-04-03

## Problem

The status page table had a "Last Indexed" column that was misleading. The backend's
`last_indexed` field records when content actually changed (a file was re-indexed because
its content hash differed), not when the source was last checked for changes. Sources are
polled every 5 minutes (`DOCSERVER_POLL_INTERVAL=300`), so a repo with no recent commits
would show a stale "Last Indexed" timestamp even though the sync system was working fine.

The backend already added a `last_checked` field (2026-03-30) that tracks when each source
was last successfully scanned, but the webapp wasn't using it.

## Changes

- Renamed "Last Indexed" column to "Last Updated" to clarify it shows when content changed
- Added "Last Scanned" column showing `last_checked` — when the source was last polled
- Added `last_checked: string | null` to the `HealthSource` TypeScript interface
- Extended sort support to include the new column
- Updated `docs/architecture.md` to reflect new column names
