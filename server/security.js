import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';

export const SESSION_TTL = 3600;
const buckets = new Map();
const issuer = 'postcraft';
export function getConfig() {
  const { SESSION_SECRET, APP_USERNAME, APP_PASSWORD } = process.env;
  if (
    !SESSION_SECRET ||
    SESSION_SECRET.length < 32 ||
    !APP_USERNAME ||
    !APP_PASSWORD
  )
    throw new Error('Authentication is not configured.');
  const origin = new URL(process.env.APP_URL || 'http://localhost:5173').origin;
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.APP_URL || !origin.startsWith('https://'))
  )
    throw new Error('HTTPS APP_URL required.');
  return {
    secret: SESSION_SECRET,
    username: APP_USERNAME,
    password: APP_PASSWORD,
    origin,
    secure: origin.startsWith('https://'),
  };
}
export function equalSecret(a, b) {
  const hash = (value) =>
    createHash('sha256')
      .update(String(value ?? ''))
      .digest();
  return timingSafeEqual(hash(a), hash(b));
}
export function credentialVersion(config) {
  return createHmac('sha256', config.secret)
    .update(`${config.username}\0${config.password}`)
    .digest('base64url');
}
export async function seal(payload, purpose, ttl, config = getConfig()) {
  const key = createHash('sha256')
    .update(`${purpose}\0${config.secret}`)
    .digest();
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuer(issuer)
    .setAudience(purpose)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
    .encrypt(key);
}
export async function unseal(token, purpose, config = getConfig()) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  try {
    const key = createHash('sha256')
      .update(`${purpose}\0${config.secret}`)
      .digest();
    const { payload } = await jwtDecrypt(token, key, {
      issuer,
      audience: purpose,
      keyManagementAlgorithms: ['dir'],
      contentEncryptionAlgorithms: ['A256GCM'],
      requiredClaims: ['exp', 'iat', 'iss', 'aud'],
    });
    return payload;
  } catch {
    return null;
  }
}
export function readCookie(req, name) {
  const cookies =
    typeof req.headers.cookie === 'string' ? req.headers.cookie.split(';') : [];
  const entry = cookies.find((item) => item.trim().startsWith(`${name}=`));
  return entry ? entry.trim().slice(name.length + 1) : undefined;
}
export function setCookie(res, name, value, ttl, config = getConfig()) {
  if (value.length > 3800) throw new Error('Session payload is too large.');
  const cookie = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}${config.secure ? '; Secure' : ''}`;
  const existing = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [
    ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
    cookie,
  ]);
}
export async function readSession(req, config = getConfig()) {
  const payload = await unseal(
    readCookie(req, 'pc_session'),
    'session',
    config,
  );
  return payload &&
    payload.sub === config.username &&
    typeof payload.sid === 'string' &&
    equalSecret(payload.version, credentialVersion(config))
    ? payload
    : null;
}
export function csrfToken(session, config = getConfig()) {
  return createHmac('sha256', config.secret)
    .update(`csrf:${session.sid}`)
    .digest('base64url');
}
// Per process by default. Configure Redis REST for limits shared by serverless instances.
// A configured Redis outage fails closed rather than silently disabling the limit.
export async function takeRateLimit(
  subject,
  limit,
  windowSeconds,
  config = getConfig(),
) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const digest = createHmac('sha256', config.secret)
    .update(subject)
    .digest('hex');
  const key = `postcraft:${digest}:${bucket}`;
  const url = process.env.RATE_LIMIT_REDIS_REST_URL,
    token = process.env.RATE_LIMIT_REDIS_REST_TOKEN;
  if (url || token) {
    if (!url?.startsWith('https://') || !token)
      throw new Error('Rate limiting configuration invalid.');
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSeconds * 2],
      ]),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('Rate limiting unavailable.');
    const results = await response.json();
    if (
      !Array.isArray(results) ||
      results.some((x) => x.error) ||
      !Number.isFinite(results[0]?.result)
    )
      throw new Error('Rate limiting unavailable.');
    return results[0].result <= limit;
  }
  const now = Date.now();
  for (const [id, entry] of buckets)
    if (entry.expires <= now) buckets.delete(id);
  const entry = buckets.get(key) || {
    count: 0,
    expires: (bucket + 1) * windowSeconds * 1000,
  };
  if (entry.count >= limit || (!buckets.has(key) && buckets.size >= 10000))
    return false;
  entry.count++;
  buckets.set(key, entry);
  return true;
}
export function withSession(
  handler,
  { methods = ['POST'], rate = 'standard' } = {},
) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));
      return res.status(405).json({ error: 'Method not allowed.' });
    }
    try {
      const config = getConfig(),
        session = await readSession(req, config);
      if (!session) return res.status(401).json({ error: 'Please sign in.' });
      const unsafe = !['GET', 'HEAD'].includes(req.method);
      if (
        unsafe &&
        (req.headers.origin !== config.origin ||
          !equalSecret(
            req.headers['x-postcraft-csrf'],
            csrfToken(session, config),
          ))
      )
        return res
          .status(403)
          .json({ error: 'Invalid request origin or CSRF token.' });
      if (
        unsafe &&
        !String(req.headers['content-type'] || '')
          .toLowerCase()
          .startsWith('application/json')
      )
        return res.status(415).json({ error: 'Use application/json.' });
      if (
        !(await takeRateLimit(
          `${rate}:${session.sub}`,
          rate === 'generation' ? 10 : 60,
          60,
          config,
        ))
      ) {
        res.setHeader('Retry-After', '60');
        return res
          .status(429)
          .json({ error: 'Request limit reached. Try again in a minute.' });
      }
      return await handler(req, res, { session, config });
    } catch {
      return res
        .status(503)
        .json({ error: 'Service unavailable. Check server configuration.' });
    }
  };
}
export async function linkedInSession(req, session, config) {
  const payload = await unseal(
    readCookie(req, 'li_session'),
    'linkedin',
    config,
  );
  return payload &&
    payload.sid === session.sid &&
    typeof payload.token === 'string' &&
    typeof payload.userId === 'string'
    ? payload
    : null;
}
export function newSession(config) {
  return {
    sub: config.username,
    sid: randomBytes(32).toString('base64url'),
    version: credentialVersion(config),
  };
}
