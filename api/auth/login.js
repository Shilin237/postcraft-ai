import {
  getConfig,
  equalSecret,
  newSession,
  seal,
  setCookie,
  csrfToken,
  takeRateLimit,
  SESSION_TTL,
} from '../../server/security.js';
export default async function login(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  try {
    const config = getConfig();
    if (req.headers.origin !== config.origin)
      return res.status(403).json({ error: 'Invalid request origin.' });
    if (
      !String(req.headers['content-type'] || '')
        .toLowerCase()
        .startsWith('application/json')
    )
      return res.status(415).json({ error: 'Use application/json.' });
    // Global single owner account limit: spoofing an IP cannot bypass it.
    if (!(await takeRateLimit('login', 10, 300, config))) {
      res.setHeader('Retry-After', '300');
      return res.status(429).json({
        error: 'Too many sign in attempts. Try again in five minutes.',
      });
    }
    const { username, password } = req.body || {};
    const validUser =
      typeof username === 'string' && equalSecret(username, config.username);
    const validPassword =
      typeof password === 'string' && equalSecret(password, config.password);
    if (!validUser || !validPassword)
      return res.status(401).json({ error: 'Invalid username or password.' });
    const session = newSession(config);
    setCookie(
      res,
      'pc_session',
      await seal(session, 'session', SESSION_TTL, config),
      SESSION_TTL,
      config,
    );
    setCookie(res, 'li_session', '', 0, config);
    setCookie(res, 'pc_oauth', '', 0, config);
    return res.json({ ok: true, csrfToken: csrfToken(session, config) });
  } catch {
    return res
      .status(503)
      .json({ error: 'Sign in is not configured or temporarily unavailable.' });
  }
}
