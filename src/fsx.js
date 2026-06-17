import fs from 'node:fs';
import path from 'node:path';

const RENAME_RETRY_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'ENOENT']);

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function fileExists(file) {
  try {
    fs.accessSync(file);
    return true;
  } catch {
    return false;
  }
}

export function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function temporaryName(target) {
  const token = `${process.pid.toString(36)}-${process.hrtime.bigint().toString(36)}`;
  return `${target}.tmp-${token}`;
}

function renameWithRetry(from, to, attempts = 10) {
  let delay = 10;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (err) {
      const lastAttempt = attempt === attempts - 1;
      if (lastAttempt || !RENAME_RETRY_CODES.has(err.code)) {
        try {
          fs.unlinkSync(from);
        } catch {}
        throw err;
      }
      sleepSync(delay);
      delay = Math.min(delay * 2, 500);
    }
  }
}

export function atomicWriteFile(target, data, { mode = 0o600 } = {}) {
  ensureDir(path.dirname(target));
  const temp = temporaryName(target);
  const fd = fs.openSync(temp, 'wx', mode);
  try {
    fs.writeSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(temp, mode);
    } catch {}
  }
  renameWithRetry(temp, target);
}

export function writeJsonFileAtomic(file, value, options) {
  atomicWriteFile(file, `${JSON.stringify(value, null, 2)}\n`, options);
}

export function copyFileAtomic(source, target, options) {
  atomicWriteFile(target, fs.readFileSync(source), options);
}
