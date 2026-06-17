#!/usr/bin/env node
import { main } from '../src/cli.js';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 19)) {
  console.error('codex-acct requires Node.js >= 20.19');
  process.exit(1);
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code ?? 0;
  })
  .catch((err) => {
    console.error(err?.stack || String(err));
    process.exitCode = 1;
  });
