import { withSession, linkedInSession } from '../../server/security.js';
export default withSession(async function handler(
  req,
  res,
  { session: appSession, config },
) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await linkedInSession(req, appSession, config);
  if (!session?.token)
    return res.status(401).json({ error: 'Not connected to LinkedIn' });
  if (!session?.userId)
    return res.status(401).json({ error: 'User ID missing — reconnect' });

  const { text } = req.body || {};
  const version = process.env.LINKEDIN_API_VERSION;
  if (!/^20\d{4}$/.test(version || ''))
    return res
      .status(503)
      .json({ error: 'Configure a supported LINKEDIN_API_VERSION.' });
  if (typeof text !== 'string' || !text.trim() || text.length > 3000)
    return res.status(400).json({ error: 'Post text is empty' });

  try {
    const postRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': version,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: `urn:li:person:${session.userId}`,
        commentary: text.trim(),
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    });

    if (postRes.status === 201) {
      const location =
        postRes.headers.get('x-restli-id') ||
        postRes.headers.get('location') ||
        '';
      return res.json({ success: true, postId: location });
    }
    res.status(502).json({
      error: 'LinkedIn rejected the post. Check permissions and reconnect.',
    });
  } catch (err) {
    res.status(502).json({ error: 'LinkedIn is unavailable. Try again.' });
  }
});
