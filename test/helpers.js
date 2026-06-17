function encodeSegment(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function makeJwt(payload) {
  return `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(payload)}.signature`;
}

export function makeChatgptAuth({ email, accountId, plan = 'pro', exp = 1893456000, name = 'Test User' }) {
  return {
    auth_mode: 'chatgpt',
    OPENAI_API_KEY: null,
    tokens: {
      id_token: makeJwt({
        email,
        name,
        exp,
        'https://api.openai.com/auth': {
          chatgpt_plan_type: plan,
          chatgpt_account_id: accountId,
          organizations: [{ id: 'org-1', is_default: true, title: 'Personal', role: 'owner' }],
        },
      }),
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      account_id: accountId,
    },
    last_refresh: '2026-06-17T00:00:00Z',
  };
}

export function makeApiKeyAuth(key = 'sk-test-1234567890') {
  return { auth_mode: 'apikey', OPENAI_API_KEY: key, tokens: null };
}
