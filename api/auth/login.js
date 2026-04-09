export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body || {};

  const VALID_USER = process.env.APP_USERNAME;
  const VALID_PASS = process.env.APP_PASSWORD;

  if (!VALID_USER || !VALID_PASS) {
    return res.status(500).json({ ok: false, error: "APP_USERNAME / APP_PASSWORD not set on server." });
  }

  if (username === VALID_USER && password === VALID_PASS) {
    return res.json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: "Invalid username or password." });
}
