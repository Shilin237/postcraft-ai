import { withSession } from '../server/security.js';
export default withSession(
  async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const { prompt, width = '1280', height = '720', seed } = req.query;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000)
      return res.status(400).json({ error: 'prompt is required' });

    if (
      ![width, height].every(
        (x) => /^\d+$/.test(String(x)) && Number(x) >= 64 && Number(x) <= 2048,
      ) ||
      (seed !== undefined && !/^\d{1,9}$/.test(String(seed)))
    )
      return res
        .status(400)
        .json({ error: 'Invalid image dimensions or seed.' });
    const s = seed || Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&model=flux&seed=${s}`;

    try {
      const imgRes = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!imgRes.ok) throw new Error(`Pollinations returned ${imgRes.status}`);
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/'))
        throw new Error('Non-image response');
      res.setHeader('Content-Type', contentType);
      const buffer = await imgRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err) {
      res.status(502).json({ error: 'Image generation failed. Try again.' });
    }
  },
  { methods: ['GET'], rate: 'generation' },
);
