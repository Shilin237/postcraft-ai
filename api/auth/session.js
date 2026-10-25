import { withSession, csrfToken } from '../../server/security.js';
export default withSession(
  (_req, res, { session, config }) =>
    res.json({ ok: true, csrfToken: csrfToken(session, config) }),
  { methods: ['GET'] },
);
