import { withSession, setCookie } from '../../server/security.js';
export default withSession((_req, res, { config }) => {
  for (const name of ['pc_session', 'pc_oauth', 'li_session'])
    setCookie(res, name, '', 0, config);
  return res.json({ ok: true });
});
