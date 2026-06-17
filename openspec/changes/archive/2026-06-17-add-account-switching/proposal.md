## Why

OpenAI Codex stores a single login in `~/.codex/auth.json`. When one account's usage is exhausted there is no built-in way to switch to another account and back; users must re-run the full browser login each time, losing the previous session's refreshed tokens. Developers who hold several accounts need to alternate between them as quickly as `nvm` alternates Node versions.

## What Changes

- Introduce `codex-acct`, a cross-platform CLI (bin `codex-acct`, alias `cxa`) that saves named snapshots of `~/.codex/auth.json` and swaps the active one on demand.
- Switching re-snapshots the currently active account first, so the tokens Codex refreshed during use are never lost.
- Accounts are identified and de-duplicated by `chatgpt_account_id` decoded from the id-token JWT, and listed with email, plan, organization and id-token expiry.
- Account lifecycle: add (via `codex login`, by importing a file, or from the current login), rename, remove, set a default, and an interactive picker on bare invocation.
- Swaps touch **only** `auth.json`; sessions, memories, skills and config stay shared. Writes are atomic and snapshots are stored with `0600` permissions; tokens are never logged.

## Capabilities

### New Capabilities
- `account-switching`: Save, switch, identify and manage multiple Codex login credentials by swapping `~/.codex/auth.json` between named snapshots.

### Modified Capabilities

## Impact

- New package `codex-acct`: `bin/codex-acct.js`, `src/*` modules, `test/*` suite.
- Reads/writes `~/.codex/auth.json` and a new `~/.codex/accounts/` store (`<alias>.auth.json` + `index.json`); honors `CODEX_HOME` and `CODEX_BIN`.
- Shells out to the external `codex login` command for the mint flow.
- Runtime: Node.js >= 20.19, zero runtime dependencies.
