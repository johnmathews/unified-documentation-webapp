# Bug Investigation: Silent File Reverts — Root Cause Found

**Date:** 2026-03-29

## Summary

Investigated and identified the root cause of the bug where tracked git files were silently reverted during long Claude Code sessions. The cause is Claude Code's internal checkpoint/file-history-snapshot system, which runs `git reset --hard origin/main` on the main working tree every 10 minutes.

## Investigation Approach

Launched 5 parallel investigation tracks:
1. Claude Code hooks and settings
2. Git configuration and hooks
3. macOS system-level mechanisms (LaunchAgents, cron, cloud sync, Time Machine)
4. Claude Code Edit tool internals and context compression
5. Vite/SvelteKit dev server file-writing behavior

## Key Finding

The git reflog contains **90+ entries** of `reset: moving to origin/main` at exact 10-minute intervals. The second offset varies per session (confirming `setInterval` tied to session start), and the bug was **reproduced live** — a tracked file was modified, and at the next 10-minute boundary it silently reverted while an untracked canary file survived.

## What Was Ruled Out

Every external cause was eliminated: no git hooks, no Claude Code hooks doing git ops, no macOS sync tools, no cron jobs, no file watchers, no Vite file writes, no IDE auto-formatting. The cause is internal to Claude Code's Node.js process.

## Confirmed Mitigations

1. **Git worktrees are immune** — the worktree reflog shows zero reset entries
2. **Committing frequently** prevents data loss — the reset can't revert committed changes

## Files Changed

- `BUG-FILE-REVERTS.md` — Updated status to RESOLVED, added root cause evidence and mitigations
- `.engineering-team/investigation-report.md` — Full investigation report with all evidence
- `journal/260329-bug-investigation-file-reverts.md` — This entry
