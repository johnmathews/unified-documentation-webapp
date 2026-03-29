# Bug Investigation: Silent File Reverts

**Date:** 2026-03-29

## Summary

Investigated a bug where tracked git files were silently reverted during long Claude Code sessions. Something inside Claude Code runs `git fetch origin` + `git reset --hard origin/main` on the main working tree every 10 minutes. The exact internal mechanism was not identified (compiled binary, no sudo for tracing), but all external causes were eliminated and the Claude Code process is the only candidate.

Reported as [anthropics/claude-code#40710](https://github.com/anthropics/claude-code/issues/40710).

## Investigation Approach

Launched 5 parallel investigation tracks:
1. Claude Code hooks and settings
2. Git configuration and hooks
3. macOS system-level mechanisms (LaunchAgents, cron, cloud sync, Time Machine)
4. Claude Code Edit tool internals and context compression
5. Vite/SvelteKit dev server file-writing behavior

Then deeper investigation:
6. Process-level monitoring (lsof, fswatch on `.git/`)
7. Binary analysis (strings extraction from compiled Bun binary)
8. Marketplace clone deletion test (disproven as cause)

## Key Evidence

- **95+ reflog entries** of `reset: moving to origin/main` at exact 10-minute intervals across 4 sessions
- **Live reproduction** — tracked file reverted at the next 10-minute mark, untracked canary survived
- **fswatch** caught `.git/` lock file operations at the exact reset time
- **No external `git` binary spawned** — programmatic operations within the Claude Code process
- **Only the Claude Code CLI process** (PID 70111) has CWD in the affected repo

## What Was Ruled Out

All external causes eliminated: git hooks, Claude Code user hooks, plugin marketplace updater (deletion test — resets continued), macOS sync/cron/LaunchAgents, Vite/SvelteKit, IDE/editors, file watchers.

**Not investigated:** Claude desktop app (`/Applications/Claude.app`) — was running but not checked for git integration.

## Confirmed Mitigations

1. **Git worktrees are immune** — zero reset entries in worktree reflog
2. **Committing frequently** prevents data loss

## Files Changed

- `BUG-FILE-REVERTS.md` — Updated with root cause evidence, eliminated causes, mitigations, and issue link
- `.engineering-team/investigation-report.md` — Full investigation report (written in worktree, merged)
- `journal/260329-bug-investigation-file-reverts.md` — This entry
