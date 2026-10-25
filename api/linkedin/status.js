import { withSession, linkedInSession } from '../../server/security.js';
export default withSession(
  async (req, res, { session, config }) => {
    const linkedin = await linkedInSession(req, session, config);
    return res.json({ connected: !!linkedin, name: linkedin?.name || null });
  },
  { methods: ['GET'] },
);
