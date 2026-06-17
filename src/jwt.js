const OPENAI_AUTH_CLAIM = 'https://api.openai.com/auth';

export function decodeJwtPayload(token) {
  if (typeof token !== 'string') throw new Error('token is not a string');
  const segment = token.split('.')[1];
  if (!segment) throw new Error('malformed JWT: missing payload segment');
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

export function fingerprint(secret) {
  if (typeof secret !== 'string' || secret.length < 8) return '****';
  return `…${secret.slice(-4)}`;
}

export function identityFromAuth(auth) {
  if (!auth || typeof auth !== 'object') throw new Error('auth.json is not an object');

  const idToken = auth.tokens && auth.tokens.id_token;
  if (!idToken) {
    if (auth.OPENAI_API_KEY) {
      return {
        authMode: auth.auth_mode || 'apikey',
        email: null,
        name: null,
        plan: 'api-key',
        accountId: null,
        idTokenExp: null,
        subscriptionEndsAt: null,
        org: null,
        apiKeyFingerprint: fingerprint(auth.OPENAI_API_KEY),
      };
    }
    throw new Error('auth.json has neither a ChatGPT id_token nor an API key');
  }

  const claims = decodeJwtPayload(idToken);
  const authClaim = claims[OPENAI_AUTH_CLAIM] || {};
  const orgs = Array.isArray(authClaim.organizations) ? authClaim.organizations : [];
  const defaultOrg = orgs.find((org) => org && org.is_default) || orgs[0] || null;

  return {
    authMode: auth.auth_mode || 'chatgpt',
    email: claims.email || null,
    name: claims.name || null,
    plan: authClaim.chatgpt_plan_type || 'unknown',
    accountId: authClaim.chatgpt_account_id || (auth.tokens && auth.tokens.account_id) || null,
    idTokenExp: typeof claims.exp === 'number' ? claims.exp : null,
    subscriptionEndsAt: authClaim.chatgpt_subscription_active_until || null,
    org: defaultOrg ? { title: defaultOrg.title || null, role: defaultOrg.role || null } : null,
  };
}
