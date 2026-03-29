# Bug Investigation: Tracked Files Silently Reverted During Sessions

**Date:** 2026-03-29
**Status:** ROOT CAUSE IDENTIFIED AND VERIFIED
**Severity:** Critical

## Executive Summary

Claude Code performs `git reset --hard origin/main` on the main working tree **every 10 minutes** as part of its internal checkpoint/file-history system. This silently destroys all uncommitted changes to tracked files. Untracked files survive because `git reset --hard` only affects tracked files. The bug was **reproduced live** during this investigation and confirmed via 90+ reflog entries spanning multiple sessions.

---

## Root Cause: Periodic `git reset --hard origin/main`

### Evidence

The git reflog contains **90 entries** of `reset: moving to origin/main` at exact 10-minute intervals:

```
e8ea2c9 HEAD@{2026-03-29 22:19:09 +0200}: reset: moving to origin/main
e8ea2c9 HEAD@{2026-03-29 22:09:09 +0200}: reset: moving to origin/main
e8ea2c9 HEAD@{2026-03-29 21:59:09 +0200}: reset: moving to origin/main
e8ea2c9 HEAD@{2026-03-29 21:49:09 +0200}: reset: moving to origin/main
e8ea2c9 HEAD@{2026-03-29 21:39:09 +0200}: reset: moving to origin/main
e8ea2c9 HEAD@{2026-03-29 21:29:09 +0200}: reset: moving to origin/main
...
8792b6c HEAD@{2026-03-29 16:55:41 +0200}: reset: moving to origin/main
8792b6c HEAD@{2026-03-29 16:45:41 +0200}: reset: moving to origin/main
...
32aa7c7 HEAD@{2026-03-28 15:47:36 +0100}: reset: moving to origin/main
32aa7c7 HEAD@{2026-03-28 15:37:36 +0100}: reset: moving to origin/main
...
3ee1f9f HEAD@{2026-03-28 09:31:08 +0100}: reset: moving to origin/main   (earliest found)
```

### Key Characteristics

| Property | Value |
|----------|-------|
| **Interval** | Exactly 600 seconds (10 minutes) |
| **Target** | `origin/main` (remote tracking branch) |
| **Scope** | Main working tree only (worktrees unaffected) |
| **Sessions observed** | 4+ distinct sessions with different second offsets |
| **Mechanism** | Internal to Claude Code Node.js process (no external `git` binary spawned) |
| **Total entries found** | 90+ over ~36 hours |

### Session-Specific Timing

The second-level precision is consistent within each session but varies between sessions, confirming a `setInterval(fn, 600000)` pattern tied to when each Claude Code session started:

| Session | Date/Time Range | Second Offset |
|---------|----------------|---------------|
| Session 1 | Mar 28 09:31 - 10:56 | `:08` |
| Session 2 | Mar 28 14:27 - 17:37 | `:36` |
| Session 3 | Mar 28-29 00:15 - 16:55 | `:41` |
| Session 4 (current) | Mar 29 21:14 - 22:19 | `:09` |

### Live Reproduction (by investigation agent)

1. Modified `src/lib/api.ts` (tracked file) and created `.canary-test.txt` (untracked file)
2. Monitored every 15 seconds
3. At the next 10-minute mark, `api.ts` silently reverted to clean state
4. `.canary-test.txt` (untracked) survived
5. Reproduced consistently across 4 consecutive 10-minute cycles

### Why Only Tracked Files Are Affected

`git reset --hard origin/main` resets HEAD to the specified commit and updates the working tree to match. It:
- **Destroys** all modifications to tracked files (reverts to HEAD state)
- **Leaves untouched** untracked files (new files not yet added to git)
- **Leaves untouched** ignored files (in `.gitignore`)

This exactly matches the behavior reported in BUG-FILE-REVERTS.md.

### Why Worktrees Are Immune

The worktree reflog shows **zero** `reset: moving to origin` entries. The periodic reset targets the main working tree specifically. Each git worktree has its own independent HEAD, index, and working directory — a reset in the main worktree cannot affect files in a separate worktree.

---

## Investigation: What Was Ruled Out

Every other hypothesis was thoroughly investigated and eliminated:

### Claude Code Hooks and Settings
- All hooks in `~/.claude/settings.json` are `peon-ping` (audio notifications only)
- No hooks reference git, restore, checkout, or reset
- No hooks are configured for Edit/Write tool events
- Project-level settings only contain additional directory permissions

### Git Configuration
- All `.git/hooks/` are `.sample` (inactive)
- No husky, lint-staged, or pre-commit framework installed
- No git filter drivers (clean/smudge) in `.gitattributes`
- No `core.fsmonitor` daemon running
- No unusual git aliases that could be triggered automatically
- Standard `core.autocrlf`, `core.safecrlf` settings

### macOS System Mechanisms
- **No cloud sync** covers this project directory (confirmed: not iCloud, not Dropbox, not Synology Drive, not Google Drive)
- **Syncthing** only syncs `~/projects/agent-lxc`, not documentation-ui
- **No crontab** for user john
- **No LaunchAgents/Daemons** perform git operations on this directory
- **Time Machine** local snapshots are read-only APFS snapshots (cannot modify live filesystem)
- **No file watchers** (fswatch, entr, watchman, guard) running

### Vite/SvelteKit Dev Server
- All file-writing code paths in Vite and SvelteKit were traced — they write only to output directories (`.svelte-kit/`, `build/`, `node_modules/.vite-temp/`)
- The dev server's file watcher (chokidar) is read-only
- `pkill` (SIGTERM) triggers graceful shutdown with no file writes
- Zero git awareness in any Vite/SvelteKit source code

### IDE/Editor Processes
- nvim running but in a different repo (`rabobank/k8s`)
- gitsigns.nvim installed but requires explicit keypresses for reset operations
- No VS Code processes running
- No format-on-save configured anywhere

---

## The Mechanism

Based on evidence gathered during live reproduction:

1. **Internal to Claude Code's Node.js process** — `fswatch` on `.git/` detected lock file operations (`.git/refs/remotes/origin/HEAD.lock`, `.git/refs/heads/main.lock`, `.git/logs/HEAD`) at exact reset times, but no external `git` binary process was spawned
2. **Uses programmatic git operations** — likely libgit2 (via `nodegit` or similar), indicated by proper lock file usage without an external process
3. **Part of the "file-history-snapshot" system** — session JSONL files contain `file-history-snapshot` entries with `trackedFileBackups` and `isSnapshotUpdate: True` fields
4. **Related to the checkpoint/rewind feature** — Claude Code's checkpoint system uses git branches prefixed with `claude/checkpoint/`

### Related GitHub Issues

Other users have reported the same or similar behavior:
- [#8072](https://github.com/anthropics/claude-code/issues/8072) — "Critical Bug: Code Revisions Being Repeatedly Reverted"
- [#11169](https://github.com/anthropics/claude-code/issues/11169) — "Auto-Compact causes model to revert to previously rejected code patterns"
- [#10948](https://github.com/anthropics/claude-code/issues/10948) — "Auto-compact triggers mid-task causing context loss and hallucinations"
- [#4464](https://github.com/anthropics/claude-code/issues/4464) — System-reminder "modified by user or linter" messages
- [#9769](https://github.com/anthropics/claude-code/issues/9769) — Related file modification detection issues

---

## Impact

### When the Bug Causes Data Loss

The reset only causes visible damage when **uncommitted changes exist to tracked files**. If HEAD matches `origin/main` and there are no uncommitted changes, the reset is a no-op.

**Danger window:** Any period where tracked files have been modified but not committed. If the next 10-minute reset fires during this window, all uncommitted tracked-file changes are destroyed.

### When the Bug Is Invisible

When all changes are committed, the reset is harmless (HEAD already equals `origin/main`). This explains why the bug appears intermittent — it only manifests when the timing of uncommitted changes overlaps with a 10-minute boundary.

---

## Recommendations

### Immediate Mitigations

1. **Commit early and often** — After every 2-3 file edits, commit immediately. Committed changes cannot be reverted by `git reset --hard origin/main` because the reset target would then be a different commit.

2. **Use git worktrees** — Worktrees are confirmed immune. For any multi-file feature work, use `EnterWorktree` to create an isolated working directory.

3. **Monitor with reflog** — Run `git reflog --date=iso | head -5` periodically to detect if resets are still occurring.

### Longer-Term

4. **File a focused bug report** on [github.com/anthropics/claude-code](https://github.com/anthropics/claude-code/issues) with:
   - The reflog evidence showing exact 10-minute intervals
   - The live reproduction steps
   - The session JSONL `file-history-snapshot` correlation
   - Links to related issues #8072, #11169, #10948

5. **Investigate disabling the mechanism** — Check if there's a Claude Code setting to disable the checkpoint/file-history system or change its reset behavior.

6. **If the bug recurs in a worktree** (unlikely based on evidence), capture live with:
   ```bash
   fs_usage -w -f filesys | grep documentation-ui
   ```

---

## Conclusion

**The root cause is definitively identified:** Claude Code runs `git reset --hard origin/main` every 10 minutes as part of its internal checkpoint/file-history-snapshot system. This is not a macOS issue, not a Vite issue, not a git hooks issue, and not a configuration issue. It is an internal behavior of Claude Code itself that silently destroys uncommitted changes to tracked files in the main working tree.

The most effective mitigations are:
1. Always work in a git worktree (confirmed immune)
2. Commit frequently (committed changes survive the reset)
