export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Set-Cookie", "li_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/");
  res.json({ success: true });
}
