function getLiSession(req) {
  try {
    const cookies = Object.fromEntries(
      (req.headers.cookie || "").split(";").map(c => c.trim().split("=")).filter(([k]) => k).map(([k, ...v]) => [k.trim(), decodeURIComponent(v.join("=").trim())])
    );
    return cookies.li_session ? JSON.parse(cookies.li_session) : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = getLiSession(req);
  if (!session?.token)  return res.status(401).json({ error: "Not connected to LinkedIn" });
  if (!session?.userId) return res.status(401).json({ error: "User ID missing — reconnect" });

  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Post text is empty" });

  try {
    const postRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization:               `Bearer ${session.token}`,
        "Content-Type":              "application/json",
        "LinkedIn-Version":          "202410",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${session.userId}`,
        commentary: text.trim(),
        visibility: "PUBLIC",
        distribution: { feedDistribution:"MAIN_FEED", targetEntities:[], thirdPartyDistributionChannels:[] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (postRes.status === 201) {
      const location = postRes.headers.get("x-restli-id") || postRes.headers.get("location") || "";
      return res.json({ success: true, postId: location });
    }
    const errData = await postRes.json().catch(() => ({}));
    res.status(postRes.status).json({ error: errData.message || errData.error || `LinkedIn returned ${postRes.status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
