## 1. Package & runtime

- [x] 1.1 Scaffold `package.json` as pure ESM, zero runtime deps, `engines.node >=20.19`, bins `codex-acct`/`cxa`, `files` allowlist
- [x] 1.2 Add `bin/codex-acct.js` with shebang, Node-version guard, and error-to-exit-code wiring
- [x] 1.3 Add `.gitignore`, `.gitattributes` (LF), `LICENSE` (MIT)

## 2. Paths & filesystem (`src/config.js`, `src/fsx.js`)

- [x] 2.1 Resolve `CODEX_HOME` (env override, default `~/.codex`), `auth.json`, `accounts/`, `index.json`, snapshot paths in `src/config.js`
- [x] 2.2 Implement atomic write (temp -> `fsync` -> `rename`) with `EPERM`/`EACCES`/`EBUSY` retry/backoff and `0600` mode in `src/fsx.js`
- [x] 2.3 Add `copyFileAtomic`, `writeJsonFileAtomic`, `readJsonFile`, `fileExists`, `ensureDir`

## 3. Identity (`src/jwt.js`)

- [x] 3.1 Decode id-token payload with native `base64url`
- [x] 3.2 Extract identity (email, name, plan, `chatgpt_account_id`, exp, org) and handle API-key auth
- [x] 3.3 Add `fingerprint` for masking secrets in display

## 4. Snapshot store (`src/store.js`)

- [x] 4.1 Load/save `index.json` (`default` pointer + per-alias metadata)
- [x] 4.2 Read/write/delete snapshot files from data or from a source file

## 5. Orchestration (`src/accounts.js`)

- [x] 5.1 `registerAccount` with duplicate-by-`account_id` detection
- [x] 5.2 `preserveActiveAccount` (re-snapshot active; auto-save unsaved current under unique email-derived alias)
- [x] 5.3 `switchTo` (preserve outgoing, then atomic swap of `auth.json`)
- [x] 5.4 `removeAccount` (refuse active without `--force`), `renameAccount`, default pointer maintenance
- [x] 5.5 `listAccounts` with active/default markers; alias sanitize/derive/validate/unique helpers

## 6. External Codex (`src/codex.js`)

- [x] 6.1 Shell out to `codex login` (inherited stdio, `CODEX_BIN` override, ENOENT handling)
- [x] 6.2 Best-effort running-Codex detection per platform

## 7. CLI surface (`src/cli.js`, `src/ui.js`, `src/pick.js`)

- [x] 7.1 Argument parsing and command dispatch: `use/ls/who/add/remove/rename/default/help` + version
- [x] 7.2 Target resolution by alias, email, position, or `default`
- [x] 7.3 Table/colored output, `humanizeExp`, `--json` for `ls`/`who`
- [x] 7.4 Interactive picker with TTY arrow-key selection and non-TTY degradation
- [x] 7.5 Restart-after-switch advisory and unsaved-account preservation notices

## 8. Tests & verification (`test/`)

- [x] 8.1 `test/jwt.test.js`, `test/ui.test.js`, `test/accounts.test.js` (temp `CODEX_HOME` round-trips)
- [x] 8.2 Full `node --test` suite green (19 tests)
- [x] 8.3 Live smoke against a real `auth.json` in an isolated `CODEX_HOME`

## 9. Docs

- [x] 9.1 `README.md`: install (npx/npm/source), command table, how-it-works, restart caveat, env vars, security
