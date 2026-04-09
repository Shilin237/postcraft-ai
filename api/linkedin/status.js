function getLiSession(req) {
  try {
    const cookies = Object.fromEntries(
      (req.headers.cookie || "").split(";").map(c => c.trim().split("=")).filter(([k]) => k).map(([k, ...v]) => [k.trim(), decodeURIComponent(v.join("=").trim())])
    );
    return cookies.li_session ? JSON.parse(cookies.li_session) : null;
  } catch { return null; }
}

export default function handler(req, res) {
  const session = getLiSession(req);
  res.json({ connected: !!(session?.token), name: session?.name || null });
}
