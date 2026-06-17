import test from 'node:test';
import assert from 'node:assert/strict';

import { humanizeExp } from '../src/ui.js';

const NOW = 1_700_000_000_000;

test('humanizeExp formats future spans', () => {
  assert.equal(humanizeExp(NOW / 1000 + 30, NOW), 'in 30s');
  assert.equal(humanizeExp(NOW / 1000 + 60, NOW), 'in 1m');
  assert.equal(humanizeExp(NOW / 1000 + 41 * 60, NOW), 'in 41m');
  assert.equal(humanizeExp(NOW / 1000 + 3600, NOW), 'in 1h');
  assert.equal(humanizeExp(NOW / 1000 + 4 * 3600, NOW), 'in 4h');
  assert.equal(humanizeExp(NOW / 1000 + 3 * 86400, NOW), 'in 3d');
});

test('humanizeExp formats past spans', () => {
  assert.equal(humanizeExp(NOW / 1000 - 4 * 3600, NOW), '4h ago');
  assert.equal(humanizeExp(NOW / 1000 - 2 * 86400, NOW), '2d ago');
});

test('humanizeExp handles missing expiry', () => {
  assert.equal(humanizeExp(null, NOW), '—');
  assert.equal(humanizeExp(undefined, NOW), '—');
});
