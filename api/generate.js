import { withSession } from '../server/security.js';
export default withSession(
  async (req, res) => {
    const allowed = new Set(
      (
        process.env.ALLOWED_MODELS ||
        'claude-sonnet-4-6,claude-haiku-4-5-20251001'
      )
        .split(',')
        .map((x) => x.trim()),
    );
    const { model, max_tokens, messages } = req.body || {};
    if (
      !allowed.has(model) ||
      !Number.isInteger(max_tokens) ||
      max_tokens < 1 ||
      max_tokens > 2048 ||
      !Array.isArray(messages) ||
      messages.length < 1 ||
      messages.length > 10 ||
      !messages.every(
        (m) =>
          m &&
          ['user', 'assistant'].includes(m.role) &&
          typeof m.content === 'string' &&
          m.content.length > 0,
      ) ||
      messages.reduce((n, m) => n + m.content.length, 0) > 16000
    )
      return res
        .status(400)
        .json({ error: 'Unsupported model, output limit or message payload.' });
    if (!process.env.ANTHROPIC_API_KEY)
      return res.status(503).json({ error: 'Generation is not configured.' });
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens, messages }),
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok)
        return res.status(502).json({
          error: 'The generation provider could not complete this request.',
        });
      return res.json(await response.json());
    } catch {
      return res
        .status(502)
        .json({ error: 'Generation failed or timed out. Try again.' });
    }
  },
  { rate: 'generation' },
);
