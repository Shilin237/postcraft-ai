import {
  withSession,
  unseal,
  readCookie,
  equalSecret,
  seal,
  setCookie,
} from '../../server/security.js';
export default withSession(
  async (req, res, { session, config }) => {
    const pending = await unseal(readCookie(req, 'pc_oauth'), 'oauth', config);
    setCookie(res, 'pc_oauth', '', 0, config);
    const { code, state, error } = req.query || {};
    if (
      !pending ||
      pending.sid !== session.sid ||
      typeof state !== 'string' ||
      !equalSecret(pending.state, state)
    )
      return res.status(400).json({
        error:
          'Invalid or expired LinkedIn authorization state. Reconnect from the app.',
      });
    if (error || typeof code !== 'string' || !code)
      return res.redirect(
        `${config.origin}/?li_error=Authorization%20was%20not%20completed`,
      );
    if (!process.env.LI_CLIENT_ID || !process.env.LI_CLIENT_SECRET)
      return res.status(503).json({ error: 'LinkedIn is not configured.' });
    try {
      const response = await fetch(
        'https://www.linkedin.com/oauth/v2/accessToken',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${config.origin}/api/auth/callback`,
            client_id: process.env.LI_CLIENT_ID,
            client_secret: process.env.LI_CLIENT_SECRET,
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) throw new Error('Token exchange failed');
      const token = await response.json();
      if (typeof token.access_token !== 'string')
        throw new Error('Missing token');
      const profile = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!profile.ok) throw new Error('Profile lookup failed');
      const user = await profile.json();
      if (typeof user.sub !== 'string') throw new Error('Missing user');
      const ttl = Math.min(Number(token.expires_in) || 3600, 3600);
      const payload = {
        token: token.access_token,
        userId: user.sub,
        name: String(user.name || 'LinkedIn User'),
        sid: session.sid,
      };
      setCookie(
        res,
        'li_session',
        await seal(payload, 'linkedin', ttl, config),
        ttl,
        config,
      );
      return res.redirect(`${config.origin}/?li_connected=1`);
    } catch {
      return res.redirect(
        `${config.origin}/?li_error=LinkedIn%20connection%20failed`,
      );
    }
  },
  { methods: ['GET'] },
);
