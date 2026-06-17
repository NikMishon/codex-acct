import fs from 'node:fs';
import { accountsDir, indexFilePath, snapshotFilePath } from './config.js';
import {
  atomicWriteFile,
  copyFileAtomic,
  ensureDir,
  fileExists,
  readJsonFile,
  writeJsonFileAtomic,
} from './fsx.js';

function emptyIndex() {
  return { version: 1, default: null, accounts: {} };
}

export function loadIndex() {
  if (!fileExists(indexFilePath())) return emptyIndex();
  try {
    const data = readJsonFile(indexFilePath());
    return {
      version: 1,
      default: data.default ?? null,
      accounts: data.accounts ?? {},
    };
  } catch {
    return emptyIndex();
  }
}

export function saveIndex(index) {
  writeJsonFileAtomic(indexFilePath(), index, { mode: 0o600 });
}

export function snapshotExists(alias) {
  return fileExists(snapshotFilePath(alias));
}

export function readSnapshot(alias) {
  return readJsonFile(snapshotFilePath(alias));
}

export function writeSnapshotFromData(alias, authData) {
  ensureDir(accountsDir());
  atomicWriteFile(snapshotFilePath(alias), `${JSON.stringify(authData, null, 2)}\n`, { mode: 0o600 });
}

export function writeSnapshotFromFile(alias, sourcePath) {
  ensureDir(accountsDir());
  copyFileAtomic(sourcePath, snapshotFilePath(alias), { mode: 0o600 });
}

export function deleteSnapshot(alias) {
  try {
    fs.unlinkSync(snapshotFilePath(alias));
  } catch {}
}
