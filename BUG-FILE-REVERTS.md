# Bug: Tracked files silently reverted during long Claude Code sessions

**Date:** 2026-03-29
**Status:** RESOLVED — root cause identified and verified
**Severity:** Critical — Claude Code performs `git reset --hard origin/main` every 10 minutes

## Symptoms

During a long Claude Code session (~2 hours), edits to tracked git files were silently reverted to the last committed state. This happened at least 3 times. Each time:

- All modifications to **tracked files** were lost (reverted to HEAD)
- **Untracked files** (new files like `SearchPanel.svelte`) survived every time
- No error messages or warnings — the files just silently changed back
- The revert appeared to coincide with system-reminder messages saying files were "modified, either by the user or by a linter"

The pattern is consistent with `git reset --hard origin/main` being run, since that command only affects tracked files and leaves untracked files untouched.

**Root cause:** Claude Code's internal checkpoint/file-history-snapshot system runs `git reset --hard origin/main` on the main working tree every 10 minutes. See the "Root Cause" section below for full evidence.

## Files affected

All modified tracked files in the session:
- `src/routes/+layout.svelte`
- `src/lib/components/Sidebar.svelte`
- `src/lib/api.ts`
- `src/lib/server/api.ts`
- `src/lib/api.test.ts`
- `src/lib/stores.test.ts`
- `docs/development.md`
- `CLAUDE.md`

## Investigation

### Processes running (all cleared)

| Process | PID | Working directory | Verdict |
|---------|-----|-------------------|---------|
| Claude Code (this session) | 17760 | documentation-ui | Self — the session making changes |
| Claude Code (other session) | 9874 | rabobank/k8s | Cleared — different repo |
| nvim --embed | 57638 | rabobank/k8s | Cleared — different repo, no files open here |
| yaml-language-server | 58329 | (child of nvim) | Cleared — only serves nvim |
| marksman | 57740 | (child of nvim) | Cleared — only serves nvim |
| Vite dev server | various | documentation-ui | Reads files but shouldn't write/restore them |

### Hooks and formatters (all cleared)

- **Git hooks:** All `.sample` (inactive). No husky, no lint-staged.
- **Claude Code hooks:** All `peon-ping` sound notification hooks. None modify files.
- **Prettier:** Installed as npm dependency but no format-on-save configured. No `.prettierrc`.
- **ESLint:** No auto-fix plugin, no prettier integration.
- **VS Code settings:** Only `extensions.json` (recommends Svelte extension). No `settings.json` with format-on-save.
- **No file watchers found:** No `fswatch`, `entr`, `nodemon`, or similar processes.

### Timing pattern

The reverts seemed to occur during periods when:
1. Many files had been edited but not committed
2. The conversation context was being compressed (approaching context limits)
3. The Vite dev server was being restarted (`pkill` + restart)

## Root Cause (VERIFIED 2026-03-29)

**Claude Code performs `git reset --hard origin/main` on the main working tree every 10 minutes.**

The operation runs programmatically within the Claude Code process (no external `git` binary is spawned), uses proper git lock files, and targets the main working tree specifically. The exact internal mechanism has not been identified — the compiled binary is minified and process tracing requires sudo.

**Reported:** [anthropics/claude-code#40710](https://github.com/anthropics/claude-code/issues/40710)

### Evidence: Git Reflog

90+ entries of `reset: moving to origin/main` at exact 10-minute intervals across multiple sessions:

```
e8ea2c9 HEAD@{2026-03-29 22:19:09 +0200}: reset: moving to origin/main
e8ea2c9 HEAD@{2026-03-29 22:09:09 +0200}: reset: moving to origin/main
e8ea2c9 HEAD@{2026-03-29 21:59:09 +0200}: reset: moving to origin/main
e8ea2c9 HEAD@{2026-03-29 21:49:09 +0200}: reset: moving to origin/main
...
8792b6c HEAD@{2026-03-29 16:55:41 +0200}: reset: moving to origin/main
8792b6c HEAD@{2026-03-29 16:45:41 +0200}: reset: moving to origin/main
...
32aa7c7 HEAD@{2026-03-28 15:47:36 +0100}: reset: moving to origin/main
32aa7c7 HEAD@{2026-03-28 15:37:36 +0100}: reset: moving to origin/main
```

The second-level precision is consistent within each session but varies between sessions (`:08`, `:36`, `:41`, `:09`), confirming a `setInterval(fn, 600000)` tied to session start time.

### Live Reproduction

1. Modified `src/lib/api.ts` (tracked) and created `.canary-test.txt` (untracked)
2. At the next 10-minute mark, `api.ts` silently reverted to clean state
3. `.canary-test.txt` survived
4. Reproduced consistently across 4 consecutive cycles

### Worktrees Are Immune

The worktree reflog shows **zero** `reset: moving to origin` entries. The periodic reset targets the main working tree only. Each git worktree has its own independent HEAD, index, and working directory.

### Related GitHub Issues

- [#8072](https://github.com/anthropics/claude-code/issues/8072) — "Critical Bug: Code Revisions Being Repeatedly Reverted"
- [#11169](https://github.com/anthropics/claude-code/issues/11169) — "Auto-Compact causes model to revert to previously rejected code patterns"
- [#10948](https://github.com/anthropics/claude-code/issues/10948) — "Auto-compact triggers mid-task causing context loss"

## Eliminated Causes

All of the following were thoroughly investigated and ruled out:

- **Git hooks** — All `.sample` (inactive). No husky, lint-staged, or pre-commit.
- **Claude Code hooks** — All `peon-ping` (audio only). None reference git.
- **Plugin marketplace updater** — Deleted `~/.claude/plugins/marketplaces/claude-plugins-official/` (which had no `.git`). Resets continued unchanged. Not the cause.
- **macOS mechanisms** — No cloud sync, no cron, no LaunchAgents doing git ops, Time Machine snapshots are read-only.
- **Vite/SvelteKit** — All file writes go to `.svelte-kit/` or `build/`. Zero git awareness. `pkill` triggers clean shutdown.
- **IDE/editors** — nvim in different repo. No format-on-save anywhere.
- **File watchers** — No fswatch, entr, watchman, or similar running.

### Not investigated

- **Claude desktop app** (`/Applications/Claude.app`, PID 8310) — was running during all sessions. Not checked for git integration or awareness of CLI session working directories. A potential gap in the investigation.

## Mitigations

### Confirmed Working

1. **Use git worktrees** — Worktrees are confirmed immune. The periodic reset only affects the main working tree.
2. **Commit early and often** — After every 2-3 file edits, commit immediately. The reset cannot revert committed changes (it resets to `origin/main`, which would be the same as HEAD after a push).

### Recommended

3. **Monitor with reflog** — Run `git reflog --date=iso | head -5` to detect ongoing resets.
4. **Track the bug report** — [anthropics/claude-code#40710](https://github.com/anthropics/claude-code/issues/40710).
