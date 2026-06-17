import { spawnSync } from 'node:child_process';

export function codexBinary() {
  return process.env.CODEX_BIN || 'codex';
}

export function runCodexLogin(extraArgs = []) {
  const bin = codexBinary();
  const result = spawnSync(bin, ['login', ...extraArgs], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error && result.error.code === 'ENOENT') {
    return { ok: false, reason: 'not-found', bin };
  }
  if (result.error) {
    return { ok: false, reason: 'spawn-failed', bin, error: result.error };
  }
  return { ok: result.status === 0, status: result.status, bin };
}

export function isCodexRunning() {
  try {
    if (process.platform === 'win32') {
      const out = spawnSync('tasklist', ['/FI', 'IMAGENAME eq codex.exe', '/NH'], { encoding: 'utf8' });
      if (out.status !== 0 || typeof out.stdout !== 'string') return null;
      return /codex\.exe/i.test(out.stdout);
    }
    const out = spawnSync('pgrep', ['-x', 'codex'], { encoding: 'utf8' });
    if (out.error) return null;
    return out.status === 0 && Boolean(out.stdout && out.stdout.trim());
  } catch {
    return null;
  }
}
