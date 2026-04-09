export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { prompt, width = "1280", height = "720", seed } = req.query;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const s = seed || Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&model=flux&seed=${s}`;

  try {
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`Pollinations returned ${imgRes.status}`);
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) throw new Error("Non-image response");
    res.setHeader("Content-Type", contentType);
    const buffer = await imgRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
