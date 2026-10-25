import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createApp } from '../server/app.js';
import {
  getConfig,
  seal,
  newSession,
  csrfToken,
  takeRateLimit,
  unseal,
} from '../server/security.js';
import generate from '../api/generate.js';

const nativeFetch = globalThis.fetch;
function setup() {
  Object.assign(process.env, {
    SESSION_SECRET: randomBytes(32).toString('hex'),
    APP_USERNAME: 'test-owner',
    APP_PASSWORD: 'test-only-password',
    APP_URL: 'http://localhost:5173',
    NODE_ENV: 'test',
    ANTHROPIC_API_KEY: 'test-only-key',
    LI_CLIENT_ID: 'test-client',
    LI_CLIENT_SECRET: 'test-secret',
  });
  delete process.env.RATE_LIMIT_REDIS_REST_URL;
  delete process.env.RATE_LIMIT_REDIS_REST_TOKEN;
}
async function serve(t) {
  setup();
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    globalThis.fetch = nativeFetch;
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  return async (path, options = {}) =>
    nativeFetch(`http://127.0.0.1:${server.address().port}${path}`, options);
}
async function login(request) {
  const response = await request('/api/auth/login', {
    method: 'POST',
    headers: {
      Origin: process.env.APP_URL,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: process.env.APP_USERNAME,
      password: process.env.APP_PASSWORD,
    }),
  });
  assert.equal(response.status, 200);
  return {
    cookie: response.headers.getSetCookie()[0].split(';')[0],
    token: (await response.json()).csrfToken,
    cookies: response.headers.getSetCookie(),
  };
}
function authHeaders(auth) {
  return {
    Cookie: auth.cookie,
    Origin: process.env.APP_URL,
    'Content-Type': 'application/json',
    'X-Postcraft-CSRF': auth.token,
  };
}

test('all paid and LinkedIn routes reject requests without a server session', async (t) => {
  const request = await serve(t);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error('must not call provider');
  };
  for (const [path, method] of [
    ['/api/generate', 'POST'],
    ['/api/carousel', 'POST'],
    ['/api/carousel/generate', 'POST'],
    ['/api/image', 'GET'],
    ['/api/image/generate', 'GET'],
    ['/api/linkedin/post', 'POST'],
    ['/api/linkedin/status', 'GET'],
    ['/api/linkedin/disconnect', 'POST'],
    ['/auth/linkedin', 'GET'],
    ['/api/auth/callback', 'GET'],
  ]) {
    assert.equal((await request(path, { method })).status, 401, path);
  }
  assert.equal(calls, 0);
});
test('login issues encrypted HttpOnly cookies; session restores and logout clears all cookies', async (t) => {
  const request = await serve(t),
    auth = await login(request);
  assert.match(auth.cookies[0], /HttpOnly; SameSite=Lax; Max-Age=3600/);
  assert.ok(!auth.cookie.includes(process.env.APP_USERNAME));
  const session = await request('/api/auth/session', {
    headers: { Cookie: auth.cookie },
  });
  assert.equal(session.status, 200);
  assert.equal((await session.json()).csrfToken, auth.token);
  const logout = await request('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders(auth),
    body: '{}',
  });
  assert.equal(logout.status, 200);
  assert.equal(
    logout.headers.getSetCookie().filter((x) => x.includes('Max-Age=0')).length,
    3,
  );
});
test('CSRF and origin are checked before provider requests; invalid payloads cannot spend credits', async (t) => {
  const request = await serve(t),
    auth = await login(request);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw Error('not expected');
  };
  for (const headers of [
    { Cookie: auth.cookie },
    { ...authHeaders(auth), Origin: 'https://other.example' },
    { ...authHeaders(auth), 'X-Postcraft-CSRF': 'forged' },
  ])
    assert.equal(
      (await request('/api/generate', { method: 'POST', headers, body: '{}' }))
        .status,
      403,
    );
  assert.equal(
    (
      await request('/api/generate', {
        method: 'POST',
        headers: authHeaders(auth),
        body: JSON.stringify({
          model: 'arbitrary',
          max_tokens: 999999,
          messages: [],
        }),
      })
    ).status,
    400,
  );
  assert.equal(calls, 0);
});
test('tampered, expired and credential-rotated sessions are rejected', async (t) => {
  const request = await serve(t),
    auth = await login(request);
  const config = getConfig();
  const expired = await seal(newSession(config), 'session', -1, config);
  for (const cookie of [auth.cookie + 'bad', `pc_session=${expired}`])
    assert.equal(
      (await request('/api/auth/session', { headers: { Cookie: cookie } }))
        .status,
      401,
    );
  process.env.APP_PASSWORD = 'changed-test-password';
  assert.equal(
    (await request('/api/auth/session', { headers: { Cookie: auth.cookie } }))
      .status,
    401,
  );
});
test('OAuth validates session-bound random state before token exchange', async (t) => {
  const request = await serve(t),
    auth = await login(request);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw Error('not expected');
  };
  const start = await request('/api/auth/linkedin', {
    headers: { Cookie: auth.cookie },
    redirect: 'manual',
  });
  assert.equal(start.status, 302);
  const state = new URL(start.headers.get('location')).searchParams.get(
    'state',
  );
  assert.ok(state.length >= 40);
  const pending = start.headers.getSetCookie()[0].split(';')[0];
  const bad = await request('/api/auth/callback?code=fake&state=forged', {
    headers: { Cookie: auth.cookie + '; ' + pending },
    redirect: 'manual',
  });
  assert.equal(bad.status, 400);
  assert.equal(calls, 0);
  const other = await login(request);
  const crossed = await request('/api/auth/callback?code=fake&state=' + state, {
    headers: { Cookie: other.cookie + '; ' + pending },
    redirect: 'manual',
  });
  assert.equal(crossed.status, 400);
  assert.equal(calls, 0);
});
test('successful OAuth stores encrypted token and status never exposes it', async (t) => {
  const request = await serve(t),
    auth = await login(request);
  const start = await request('/api/auth/linkedin', {
    headers: { Cookie: auth.cookie },
    redirect: 'manual',
  });
  const state = new URL(start.headers.get('location')).searchParams.get(
      'state',
    ),
    pending = start.headers.getSetCookie()[0].split(';')[0];
  globalThis.fetch = async (url) =>
    new Response(
      JSON.stringify(
        String(url).includes('accessToken')
          ? { access_token: 'private-provider-token', expires_in: 3600 }
          : { sub: 'member123', name: 'Test Member' },
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  const callback = await request(
    '/api/auth/callback?code=fake&state=' + state,
    { headers: { Cookie: auth.cookie + '; ' + pending }, redirect: 'manual' },
  );
  assert.equal(callback.status, 302);
  const li = callback.headers
    .getSetCookie()
    .find((x) => x.startsWith('li_session='))
    .split(';')[0];
  assert.ok(!li.includes('private-provider-token'));
  const status = await request('/api/linkedin/status', {
    headers: { Cookie: auth.cookie + '; ' + li },
  });
  assert.deepEqual(await status.json(), {
    connected: true,
    name: 'Test Member',
  });
});
test('shared handler works directly in Vercel and bounds provider payload', async () => {
  setup();
  const config = getConfig(),
    session = newSession(config),
    cookie = 'pc_session=' + (await seal(session, 'session', 3600, config));
  let sent;
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response(
      JSON.stringify({ content: [{ type: 'text', text: 'Draft' }] }),
    );
  };
  try {
    const req = {
      method: 'POST',
      headers: {
        cookie,
        origin: config.origin,
        'content-type': 'application/json',
        'x-postcraft-csrf': csrfToken(session, config),
      },
      body: {
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Draft a post' }],
        system: 'must not forward',
      },
    };
    const res = {
      code: 200,
      setHeader() {},
      status(c) {
        this.code = c;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    await generate(req, res);
    assert.equal(res.code, 200);
    assert.equal(sent.max_tokens, 100);
    assert.equal(sent.system, undefined);
    assert.equal(res.body.content[0].text, 'Draft');
  } finally {
    globalThis.fetch = nativeFetch;
  }
});
test('rate limits enforce ceilings and configured Redis failures fail closed', async () => {
  setup();
  for (let i = 0; i < 3; i++)
    assert.equal(await takeRateLimit('limited', 3, 60), true);
  assert.equal(await takeRateLimit('limited', 3, 60), false);
  process.env.RATE_LIMIT_REDIS_REST_URL = 'https://redis.example';
  process.env.RATE_LIMIT_REDIS_REST_TOKEN = 'test';
  globalThis.fetch = async () => new Response('', { status: 500 });
  try {
    await assert.rejects(takeRateLimit('distributed', 3, 60));
  } finally {
    globalThis.fetch = nativeFetch;
    delete process.env.RATE_LIMIT_REDIS_REST_URL;
    delete process.env.RATE_LIMIT_REDIS_REST_TOKEN;
  }
});
test('production cookies are Secure and missing configuration fails closed', async (t) => {
  const request = await serve(t);
  process.env.APP_URL = 'https://postcraft.example';
  process.env.NODE_ENV = 'production';
  const auth = await login(request);
  assert.match(auth.cookies[0], /; Secure/);
  delete process.env.SESSION_SECRET;
  assert.equal((await request('/api/auth/session')).status, 503);
});
test('sealed values cannot be used for a different cookie purpose', async () => {
  setup();
  const token = await seal({ sid: 'test' }, 'oauth', 600);
  assert.equal(await unseal(token, 'session'), null);
});
