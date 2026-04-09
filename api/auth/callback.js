export default async function handler(req, res) {
  const CLIENT_ID     = process.env.LI_CLIENT_ID;
  const CLIENT_SECRET = process.env.LI_CLIENT_SECRET;
  const APP_URL       = process.env.APP_URL || `https://${req.headers.host}`;
  const REDIRECT_URI  = `${APP_URL}/api/auth/callback`;

  const { code, error, error_description } = req.query;
  if (error) return res.redirect(`${APP_URL}?li_error=${encodeURIComponent(error_description || error)}`);

  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type:"authorization_code", code, redirect_uri:REDIRECT_URI, client_id:CLIENT_ID, client_secret:CLIENT_SECRET }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(tokenData.error_description || "Token exchange failed");

    const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    // Store token in cookie (HttpOnly for security)
    const payload = JSON.stringify({ token: tokenData.access_token, userId: userData.sub, name: userData.name || "LinkedIn User" });
    res.setHeader("Set-Cookie", `li_session=${encodeURIComponent(payload)}; HttpOnly; SameSite=Lax; Max-Age=3600; Path=/`);
    res.redirect(`${APP_URL}?li_connected=1&li_name=${encodeURIComponent(userData.name || "")}`);
  } catch (err) {
    res.redirect(`${APP_URL}?li_error=${encodeURIComponent(err.message)}`);
  }
}
