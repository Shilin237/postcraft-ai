import { withSession, setCookie } from '../../server/security.js';
export default withSession((_req, res, { config }) => {
  setCookie(res, 'li_session', '', 0, config);
  return res.json({ success: true });
});
