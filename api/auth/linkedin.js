export default function handler(req, res) {
  const CLIENT_ID = process.env.LI_CLIENT_ID;
  const APP_URL   = process.env.APP_URL || `https://${req.headers.host}`;

  if (!CLIENT_ID) return res.status(500).send("LI_CLIENT_ID not set");

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     CLIENT_ID,
    redirect_uri:  `${APP_URL}/api/auth/callback`,
    scope:         "openid profile w_member_social",
    state:         "li_" + Date.now(),
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}
