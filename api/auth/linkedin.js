import { randomBytes } from 'node:crypto';
import { withSession, seal, setCookie } from '../../server/security.js';
export default withSession(
  async (_req, res, { session, config }) => {
    if (!process.env.LI_CLIENT_ID)
      return res.status(503).json({ error: 'LinkedIn is not configured.' });
    const state = randomBytes(32).toString('base64url');
    setCookie(
      res,
      'pc_oauth',
      await seal({ state, sid: session.sid }, 'oauth', 600, config),
      600,
      config,
    );
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LI_CLIENT_ID,
      redirect_uri: `${config.origin}/api/auth/callback`,
      scope: 'openid profile w_member_social',
      state,
    });
    return res.redirect(
      `https://www.linkedin.com/oauth/v2/authorization?${params}`,
    );
  },
  { methods: ['GET'] },
);
