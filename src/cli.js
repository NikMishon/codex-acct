import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { UserError } from './errors.js';
import { fileExists, readJsonFile } from './fsx.js';
import { identityFromAuth } from './jwt.js';
import { loadIndex, saveIndex } from './store.js';
import { isCodexRunning, runCodexLogin } from './codex.js';
import { paint, printTable, humanizeExp } from './ui.js';
import { pickFromList } from './pick.js';
import {
  activeIdentity,
  aliasFromEmail,
  listAccounts,
  preserveActiveAccount,
  readActiveAuth,
  registerAccount,
  removeAccount,
  renameAccount,
  switchTo,
  uniqueAlias,
  validateAlias,
} from './accounts.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const OPTIONS = {
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean' },
  json: { type: 'boolean' },
  force: { type: 'boolean', short: 'f' },
  'from-current': { type: 'boolean' },
  import: { type: 'string' },
};

function printHelp() {
  console.log(`codex-acct — switch between OpenAI Codex accounts by swapping ~/.codex/auth.json

Usage
  codex-acct                          open the interactive account picker
  codex-acct use <alias|email|#>      switch the active account
  codex-acct ls                       list saved accounts
  codex-acct who                      show the active account
  codex-acct add [alias]              log in to a new account and save it
  codex-acct add --from-current [alias]
                                      save the account you are already logged in as
  codex-acct add --import <file> [alias]
                                      save an account from an exported auth.json
  codex-acct rename <old> <new>       rename a saved account
  codex-acct remove <alias>           delete a saved account
  codex-acct default [alias]          show or set the default account

Options
  --json          machine-readable output (ls, who)
  --force, -f      override safety refusals (remove the active account)
  --help, -h       show this help
  --version        print version

Notes
  Only auth.json is swapped — sessions, memories, skills and config stay shared.
  Codex reads auth.json at startup; restart Codex (or the IDE extension) after switching.
  Set CODEX_HOME for a non-default Codex home; set CODEX_BIN if \`codex\` is not on PATH.`);
}

function resolveTarget(target) {
  const accounts = listAccounts();
  if (target === 'default') {
    const index = loadIndex();
    if (!index.default) throw new UserError('no default account is set');
    return index.default;
  }
  if (/^\d+$/.test(target)) {
    const position = Number(target) - 1;
    if (position < 0 || position >= accounts.length) {
      throw new UserError(`no account at position ${target}`);
    }
    return accounts[position].alias;
  }
  const byAlias = accounts.find((account) => account.alias === target);
  if (byAlias) return byAlias.alias;
  if (target.includes('@')) {
    const matches = accounts.filter((account) => account.email === target);
    if (matches.length === 1) return matches[0].alias;
    if (matches.length > 1) throw new UserError(`multiple accounts use ${target}; specify an alias`);
  }
  throw new UserError(`unknown account '${target}'`);
}

function describe(identity) {
  return `${identity.email ?? 'api-key'}, ${identity.plan}`;
}

function announcePreserved(preserved) {
  if (preserved?.created) {
    console.log(paint('gray', `saved current account as '${preserved.alias}' before switching`));
  }
}

function warnRestart() {
  const running = isCodexRunning();
  if (running === true) {
    console.log(paint('yellow', 'Codex appears to be running — restart it for the switch to take effect.'));
  } else {
    console.log(paint('gray', 'Restart Codex (or the IDE extension) for the switch to take effect.'));
  }
}

function reportAdded(alias, identity, duplicateOf) {
  console.log(`${paint('green', 'saved')} ${paint('bold', alias)} (${describe(identity)})`);
  if (duplicateOf) {
    console.log(paint('yellow', `note: this is the same account as '${duplicateOf}' (same account id)`));
  }
}

function renderPickRow(row, _index, focused) {
  const marker = row.isActive ? '*' : ' ';
  const alias = row.alias.padEnd(16);
  const email = (row.email ?? '—').padEnd(28);
  const plan = (row.plan ?? '—').padEnd(8);
  const label = `${marker} ${alias} ${email} ${plan} ${humanizeExp(row.idTokenExp)}`;
  return focused ? paint('inverse', `› ${label}`) : `  ${label}`;
}

async function cmdPick() {
  const accounts = listAccounts();
  if (accounts.length === 0) {
    console.log('no saved accounts yet. Save the current login with: codex-acct add --from-current');
    return 0;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    printTable(accounts);
    process.stderr.write('not a TTY; pick an account with: codex-acct use <alias>\n');
    return 1;
  }
  const activeIndex = Math.max(0, accounts.findIndex((account) => account.isActive));
  console.log(paint('gray', 'select an account  (↑/↓ move · enter switch · esc cancel)'));
  const chosen = await pickFromList(accounts, { activeIndex, render: renderPickRow });
  if (!chosen) {
    console.log(paint('gray', 'cancelled'));
    return 0;
  }
  const { identity, preserved } = switchTo(chosen.alias);
  announcePreserved(preserved);
  console.log(`${paint('green', 'switched to')} ${paint('bold', chosen.alias)} (${describe(identity)})`);
  warnRestart();
  return 0;
}

async function cmdUse(args) {
  const target = args[0];
  if (!target) return cmdPick();
  const alias = resolveTarget(target);
  const { identity, preserved } = switchTo(alias);
  announcePreserved(preserved);
  console.log(`${paint('green', 'switched to')} ${paint('bold', alias)} (${describe(identity)})`);
  warnRestart();
  return 0;
}

function cmdList(values) {
  const accounts = listAccounts();
  if (values.json) {
    console.log(JSON.stringify(accounts, null, 2));
    return 0;
  }
  if (accounts.length === 0) {
    console.log('no saved accounts yet. Save the current login with: codex-acct add --from-current');
    return 0;
  }
  printTable(accounts);
  return 0;
}

function cmdWho(values) {
  const active = activeIdentity();
  if (values.json) {
    console.log(JSON.stringify(active, null, 2));
    return active ? 0 : 1;
  }
  if (!active) {
    console.log('not logged in (no ~/.codex/auth.json)');
    return 1;
  }
  const match = listAccounts().find(
    (account) => account.accountId && active.accountId && account.accountId === active.accountId,
  );
  const label = match ? paint('bold', match.alias) : paint('gray', '(unsaved)');
  console.log(`${label}  ${active.email ?? 'api-key'}  ${active.plan}  (id-token ${humanizeExp(active.idTokenExp)})`);
  return 0;
}

async function cmdAdd(args, values) {
  if (values.import) {
    const file = path.resolve(values.import);
    if (!fileExists(file)) throw new UserError(`file not found: ${file}`);
    const identitySource = identityFromAuth(readJsonFile(file));
    const alias = args[0] || uniqueAlias(aliasFromEmail(identitySource.email), loadIndex());
    validateAlias(alias);
    const { identity, duplicateOf } = registerAccount(alias, { sourceFile: file });
    reportAdded(alias, identity, duplicateOf);
    return 0;
  }

  if (values['from-current']) {
    const auth = readActiveAuth();
    if (!auth) throw new UserError('not logged in; nothing to save. Run `codex login` first, or use plain `add`.');
    const identitySource = identityFromAuth(auth);
    const alias = args[0] || uniqueAlias(aliasFromEmail(identitySource.email), loadIndex());
    validateAlias(alias);
    const { identity, duplicateOf } = registerAccount(alias, { authData: auth });
    reportAdded(alias, identity, duplicateOf);
    return 0;
  }

  const preserved = preserveActiveAccount();
  if (preserved?.created) {
    console.log(paint('gray', `saved current account as '${preserved.alias}' before login`));
  }
  console.log(paint('gray', 'launching `codex login` …'));
  const result = runCodexLogin();
  if (!result.ok && result.reason === 'not-found') {
    throw new UserError(
      `could not find the \`codex\` binary (tried '${result.bin}'). Set CODEX_BIN, or save the current login with: codex-acct add --from-current`,
    );
  }
  if (!result.ok) throw new UserError(`\`codex login\` exited with status ${result.status}`);

  const auth = readActiveAuth();
  if (!auth) throw new UserError('login finished but no auth.json was written');
  const identitySource = identityFromAuth(auth);
  const alias = args[0] || uniqueAlias(aliasFromEmail(identitySource.email), loadIndex());
  validateAlias(alias);
  const { identity, duplicateOf } = registerAccount(alias, { authData: auth });
  reportAdded(alias, identity, duplicateOf);
  return 0;
}

function cmdRemove(args, values) {
  const alias = args[0];
  if (!alias) throw new UserError('usage: codex-acct remove <alias>');
  removeAccount(alias, { force: Boolean(values.force) });
  console.log(`removed '${alias}'`);
  return 0;
}

function cmdRename(args) {
  const [oldAlias, newAlias] = args;
  if (!oldAlias || !newAlias) throw new UserError('usage: codex-acct rename <old> <new>');
  renameAccount(oldAlias, newAlias);
  console.log(`renamed '${oldAlias}' → '${newAlias}'`);
  return 0;
}

function cmdDefault(args) {
  const alias = args[0];
  const index = loadIndex();
  if (!alias) {
    console.log(index.default ?? '(none)');
    return 0;
  }
  if (!index.accounts[alias]) throw new UserError(`unknown account '${alias}'`);
  index.default = alias;
  saveIndex(index);
  console.log(`default → '${alias}'`);
  return 0;
}

export async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, strict: false, options: OPTIONS });
  } catch (err) {
    process.stderr.write(paint('red', `error: ${err.message}\n`));
    return 1;
  }

  const { values, positionals } = parsed;
  if (values.version) {
    console.log(pkg.version);
    return 0;
  }
  const command = positionals[0];
  if (values.help || command === 'help') {
    printHelp();
    return 0;
  }

  try {
    switch (command) {
      case undefined:
      case 'pick':
        return await cmdPick();
      case 'use':
      case 'switch':
        return await cmdUse(positionals.slice(1));
      case 'ls':
      case 'list':
        return cmdList(values);
      case 'who':
      case 'current':
        return cmdWho(values);
      case 'add':
        return await cmdAdd(positionals.slice(1), values);
      case 'remove':
      case 'rm':
        return cmdRemove(positionals.slice(1), values);
      case 'rename':
      case 'mv':
        return cmdRename(positionals.slice(1));
      case 'default':
        return cmdDefault(positionals.slice(1));
      default:
        process.stderr.write(paint('red', `unknown command '${command}'\n\n`));
        printHelp();
        return 1;
    }
  } catch (err) {
    if (err instanceof UserError) {
      process.stderr.write(paint('red', `error: ${err.message}\n`));
      return 1;
    }
    throw err;
  }
}
