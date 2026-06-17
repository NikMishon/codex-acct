# account-switching Specification

## Purpose
TBD - created by archiving change add-account-switching. Update Purpose after archive.
## Requirements
### Requirement: Save an account as a named snapshot

The tool SHALL save a Codex credential set as a named snapshot under `~/.codex/accounts/<alias>.auth.json` and record its identity in `index.json`. When an alias is omitted it SHALL derive one from the account email, sanitized and made unique. It SHALL reject credentials that do not parse as a ChatGPT id-token or an API key.

#### Scenario: Save the currently logged-in account

- **WHEN** the user runs `codex-acct add --from-current work` while `~/.codex/auth.json` exists
- **THEN** a snapshot `accounts/work.auth.json` is written and an `index.json` entry records its email, plan and `chatgpt_account_id`

#### Scenario: Import an exported auth.json

- **WHEN** the user runs `codex-acct add --import <file> [alias]` with a valid auth file
- **THEN** the file is validated, copied into the snapshot store, and registered

#### Scenario: Derive an alias from the email

- **WHEN** the user saves an account without specifying an alias
- **THEN** the alias is derived from the email local-part, sanitized to alias-safe characters, and suffixed if it collides with an existing alias

#### Scenario: Reject malformed credentials

- **WHEN** the source file has neither a decodable id-token nor a non-null API key
- **THEN** the tool reports an error and stores nothing

### Requirement: Add a new account via Codex login

The tool SHALL provide a mint flow that delegates to the external `codex login` command, preserving the current account first, then saving the newly minted credentials as a snapshot.

#### Scenario: Mint a new account

- **WHEN** the user runs `codex-acct add [alias]` with no `--from-current`/`--import` flag
- **THEN** the current account is preserved, `codex login` is launched with inherited stdio, and on success the resulting `auth.json` is saved as a snapshot

#### Scenario: Codex binary not found

- **WHEN** the `codex` executable cannot be located
- **THEN** the tool reports an actionable error suggesting `CODEX_BIN` or `add --from-current`, and exits non-zero

### Requirement: Switch the active account

The tool SHALL switch the active login by atomically replacing `~/.codex/auth.json` with a saved snapshot. Before replacement it SHALL refresh the outgoing account's snapshot from the live `auth.json`, matching by `chatgpt_account_id`, and SHALL automatically preserve a current login that is not yet saved. It SHALL accept a target given as an alias, an email, a 1-based list position, or `default`.

#### Scenario: Switch to a saved account

- **WHEN** the user runs `codex-acct use <alias>`
- **THEN** `auth.json` is atomically replaced with that account's snapshot and it becomes the active account

#### Scenario: Re-snapshot the outgoing account first

- **WHEN** the user switches away from an account that is already saved
- **THEN** that account's snapshot is updated from the live `auth.json` before the new snapshot is written

#### Scenario: Preserve an unsaved current login

- **WHEN** the current login is not registered and the user switches to another account
- **THEN** the current login is saved automatically under an email-derived alias and the user is told under which alias

#### Scenario: Resolve the target flexibly

- **WHEN** the user passes an alias, an email, a list position, or `default`
- **THEN** the tool resolves it to the matching account or reports an unambiguous error

### Requirement: List and identify accounts

The tool SHALL list saved accounts with their email, plan, organization and id-token expiry, mark the active and default accounts, and decode identity from the id-token JWT. It SHALL de-duplicate accounts by `chatgpt_account_id` rather than by email or alias.

#### Scenario: List accounts

- **WHEN** the user runs `codex-acct ls`
- **THEN** each saved account is shown with email, plan, org and id-token expiry, with the active account marked

#### Scenario: Report the active account

- **WHEN** the user runs `codex-acct who`
- **THEN** the active account's alias (or "(unsaved)"), email, plan and id-token expiry are shown

#### Scenario: Warn on duplicate account identity

- **WHEN** the user saves an account whose `chatgpt_account_id` already belongs to another alias
- **THEN** the tool warns that it is the same account

#### Scenario: Machine-readable output

- **WHEN** the user passes `--json` to `ls` or `who`
- **THEN** the output is emitted as JSON for scripting

### Requirement: Manage account lifecycle

The tool SHALL rename and remove saved accounts and get or set a default account. Removing the active account SHALL be refused unless `--force` is given.

#### Scenario: Rename an account

- **WHEN** the user runs `codex-acct rename <old> <new>`
- **THEN** the snapshot file and index entry are renamed and the default pointer is updated if it referenced the old alias

#### Scenario: Refuse removing the active account

- **WHEN** the user runs `codex-acct remove <alias>` for the active account without `--force`
- **THEN** the removal is refused with an explanation; with `--force` the snapshot and index entry are deleted

#### Scenario: Get or set the default

- **WHEN** the user runs `codex-acct default [alias]`
- **THEN** the current default is printed, or set to the given alias when one is provided

### Requirement: Interactive account picker

The tool SHALL open an interactive picker when invoked with no command in a TTY, pre-selecting the active account, and SHALL degrade to a non-interactive listing when no TTY is available.

#### Scenario: Pick an account interactively

- **WHEN** the user runs `codex-acct` with no arguments in a TTY
- **THEN** an arrow-key picker lists the accounts with the active one pre-selected, and selecting one switches to it

#### Scenario: Degrade without a TTY

- **WHEN** `codex-acct` is invoked with no command and stdin/stdout is not a TTY
- **THEN** the account table is printed and the tool exits non-zero asking for an explicit `use <alias>`

### Requirement: Safe credential handling

The tool SHALL swap only `auth.json`, never the rest of the Codex home. It SHALL write files atomically with retries for transient file locks, store snapshots with `0600` permissions on Unix, never print token material, and advise restarting Codex after a switch. It SHALL honor `CODEX_HOME` and `CODEX_BIN`.

#### Scenario: Leave shared Codex state untouched

- **WHEN** any switch, add or remove is performed
- **THEN** only `auth.json` and the `accounts/` store are modified; sessions, memories, skills and config are left intact

#### Scenario: Atomic, lock-tolerant writes

- **WHEN** a credential file is written while another process briefly holds a lock
- **THEN** the write goes to a temp file and is renamed into place, retrying on transient `EPERM`/`EACCES`/`EBUSY` errors

#### Scenario: Advise restart after switching

- **WHEN** a switch completes
- **THEN** the tool advises restarting Codex (or the IDE extension) for the change to take effect, and warns more strongly if Codex appears to be running

#### Scenario: Honor environment overrides

- **WHEN** `CODEX_HOME` or `CODEX_BIN` is set
- **THEN** the tool targets that Codex home and that login binary instead of the defaults

