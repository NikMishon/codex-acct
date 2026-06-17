## Context

OpenAI Codex keeps exactly one set of OAuth credentials in `~/.codex/auth.json`. The same directory also holds large, account-agnostic state (sqlite databases, sessions, memories, skills, config). Codex rewrites `auth.json` in place whenever it refreshes the access/id tokens during use. A switcher therefore has to manipulate one small, frequently-rewritten credential file without disturbing the rest of the Codex home, and without losing tokens that Codex rotates underneath it.

## Goals / Non-Goals

**Goals:**
- Switch the active Codex login in one command and switch back later, preserving each account's freshest tokens.
- Run identically on Windows, macOS and Linux from a single zero-dependency Node package, installable via `npx`.
- Identify accounts by stable identity (not by file name) and never leak token material.

**Non-Goals:**
- Running two accounts concurrently in the same process (that requires per-profile `CODEX_HOME`; out of scope — point heavy users to a CODEX_HOME-based tool).
- Reimplementing the OAuth/browser login flow; the mint path delegates to `codex login`.
- Live usage/quota reporting beyond what the cached token exposes.

## Decisions

- **Swap only `auth.json`, never the whole `CODEX_HOME`.** Snapshots live in `~/.codex/accounts/<alias>.auth.json` with an `index.json`. Copying the entire home would be slow, would touch live-locked sqlite files (corruption risk on Windows), and would reset shared sessions/skills on every switch.
- **Re-snapshot the active account before switching away.** Because Codex rewrites `auth.json` on refresh, the stored snapshot of the outgoing account is refreshed from the live file (matched by `chatgpt_account_id`) before the incoming snapshot is written. An unsaved current login is auto-saved under an email-derived alias so a switch never causes credential loss. This is the headline correctness rule.
- **Identity and de-duplication key is `chatgpt_account_id` from the id-token JWT**, decoded with native `Buffer.from(seg, 'base64url')` — not email (repeats across orgs) and not alias (user-editable). The decoded payload is used for display only; its signature is not verified.
- **Atomic file replacement**: write a sibling temp file, `fsync`, then `rename`, with a retry/backoff loop around `rename` for transient Windows `EPERM/EACCES/EBUSY` locks (antivirus, indexer, a running Codex). Snapshots are created `0600` on Unix.
- **Zero runtime dependencies**: `util.parseArgs` for args, `util.styleText` for color (degrades when absent / non-TTY / `NO_COLOR`), `node:test` for tests. Minimizes supply-chain exposure for a tool that handles live OAuth tokens.
- **Mint delegates to `codex login`** (stdio inherited) so OpenAI owns the browser flow; `--from-current` and `--import` cover the no-relogin paths.

## Risks / Trade-offs

- Switching while Codex is running → a live instance can rewrite `auth.json` on its next refresh and clobber the swap. Mitigation: best-effort running-process detection plus an always-on "restart Codex" notice after every switch.
- Restoring a stale snapshot whose refresh token was already rotated → `refresh_token` reuse failure. Mitigation: the re-snapshot-before-switch rule keeps stored tokens current; a dead profile surfaces an error rather than an infinite retry.
- Best-effort process detection has no reliable cross-platform Codex process name → it may report unknown. Mitigation: the restart notice is shown regardless, so safety never depends on detection succeeding.
- Email-derived aliases break on plus-addressing/collisions. Mitigation: sanitized alias with a uniqueness suffix, plus a `rename` command; all identity matching keys on `account_id`, not the alias.
