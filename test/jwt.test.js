import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeJwtPayload, identityFromAuth, fingerprint } from '../src/jwt.js';
import { makeChatgptAuth, makeApiKeyAuth, makeJwt } from './helpers.js';

test('decodeJwtPayload decodes the payload segment', () => {
  const token = makeJwt({ email: 'a@b.io', exp: 123 });
  assert.deepEqual(decodeJwtPayload(token), { email: 'a@b.io', exp: 123 });
});

test('decodeJwtPayload rejects malformed tokens', () => {
  assert.throws(() => decodeJwtPayload('not-a-jwt'));
});

test('identityFromAuth extracts ChatGPT identity', () => {
  const auth = makeChatgptAuth({ email: 'you+work@example.com', accountId: 'acc-1', plan: 'pro', exp: 1893456000 });
  const identity = identityFromAuth(auth);
  assert.equal(identity.email, 'you+work@example.com');
  assert.equal(identity.plan, 'pro');
  assert.equal(identity.accountId, 'acc-1');
  assert.equal(identity.idTokenExp, 1893456000);
  assert.deepEqual(identity.org, { title: 'Personal', role: 'owner' });
});

test('identityFromAuth handles API-key auth', () => {
  const identity = identityFromAuth(makeApiKeyAuth('sk-abcdefgh1234'));
  assert.equal(identity.plan, 'api-key');
  assert.equal(identity.email, null);
  assert.equal(identity.accountId, null);
  assert.equal(identity.apiKeyFingerprint, '…1234');
});

test('identityFromAuth throws on empty auth', () => {
  assert.throws(() => identityFromAuth({ auth_mode: 'chatgpt', tokens: null, OPENAI_API_KEY: null }));
});

test('fingerprint masks secrets', () => {
  assert.equal(fingerprint('abcd1234'), '…1234');
  assert.equal(fingerprint('short'), '****');
});
