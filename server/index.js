import express from "express";
import cors from "cors";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env manually (no dotenv package needed in Node 20+)
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(resolve(__dirname, "../.env"), "utf8");
  for (const line of env.split("\n")) {
    const [key, ...val] = line.split("=");
    if (key && val.length) process.env[key.trim()] = val.join("=").trim();
  }
} catch {
  // .env not found — user must set env vars manually
}

const app = express();
app.use(express.json());

const IS_PROD = process.env.NODE_ENV === "production";
const APP_URL = process.env.APP_URL || "http://localhost:3001";

app.use(cors({
  origin: IS_PROD ? APP_URL : /^http:\/\/localhost:\d+$/,
  credentials: true,
}));

const CLIENT_ID     = process.env.LI_CLIENT_ID;
const CLIENT_SECRET = process.env.LI_CLIENT_SECRET;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const REDIRECT_URI  = `${APP_URL}/auth/linkedin/callback`;

// ── Claude API proxy (key never leaves server) ──────────────────────────────
app.post("/api/generate", async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in .env" });
  const { model, max_tokens, messages } = req.body;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens, messages }),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
const SCOPES        = "openid profile w_member_social";

// Single-user in-memory store (personal tool)
let token  = null;
let userId = null;
let liName = null;

// ── Step 1: Start OAuth ────────────────────────────────────────────────────
app.get("/auth/linkedin", (req, res) => {
  if (!CLIENT_ID) {
    return res.status(500).send("LI_CLIENT_ID not set in .env");
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    scope:         SCOPES,
    state:         "li_state_" + Date.now(),
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

// ── Step 2: OAuth Callback ─────────────────────────────────────────────────
app.get("/auth/linkedin/callback", async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${APP_URL}?li_error=${encodeURIComponent(error_description || error)}`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  REDIRECT_URI,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || "Token exchange failed");
    }

    token = tokenData.access_token;

    // Get user info (openid scope)
    const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userRes.json();
    userId = userData.sub;
    liName = userData.name || "LinkedIn User";

    res.redirect(`${APP_URL}?li_connected=1&li_name=${encodeURIComponent(liName)}`);
  } catch (err) {
    res.redirect(`${APP_URL}?li_error=${encodeURIComponent(err.message)}`);
  }
});

// ── Connection status ──────────────────────────────────────────────────────
app.get("/api/linkedin/status", (req, res) => {
  res.json({ connected: !!token, name: liName });
});

// ── Disconnect ─────────────────────────────────────────────────────────────
app.post("/api/linkedin/disconnect", (req, res) => {
  token  = null;
  userId = null;
  liName = null;
  res.json({ success: true });
});

// ── Post to LinkedIn ───────────────────────────────────────────────────────
app.post("/api/linkedin/post", async (req, res) => {
  if (!token)  return res.status(401).json({ error: "Not connected to LinkedIn" });
  if (!userId) return res.status(401).json({ error: "User ID missing — reconnect" });

  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Post text is empty" });

  try {
    const postRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization:                `Bearer ${token}`,
        "Content-Type":               "application/json",
        "LinkedIn-Version":           "202410",
        "X-Restli-Protocol-Version":  "2.0.0",
      },
      body: JSON.stringify({
        author:             `urn:li:person:${userId}`,
        commentary:         text.trim(),
        visibility:         "PUBLIC",
        distribution: {
          feedDistribution:              "MAIN_FEED",
          targetEntities:                [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState:           "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (postRes.status === 201) {
      const location = postRes.headers.get("x-restli-id") || postRes.headers.get("location") || "";
      return res.json({ success: true, postId: location });
    }

    const errData = await postRes.json().catch(() => ({}));
    return res.status(postRes.status).json({
      error: errData.message || errData.error || `LinkedIn returned ${postRes.status}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Pollinations.ai image proxy (avoids 403 from direct browser fetch) ──────
app.get("/api/image/generate", async (req, res) => {
  const { prompt, width = "1280", height = "720", seed } = req.query;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const s = seed || Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&model=flux&seed=${s}`;

  try {
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`Pollinations returned ${imgRes.status}`);
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) throw new Error("Non-image response from Pollinations");
    res.setHeader("Content-Type", contentType);
    const buffer = await imgRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Serve built frontend in production ───────────────────────────────────────
if (IS_PROD) {
  const distPath = resolve(__dirname, "../dist");
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => res.sendFile(resolve(distPath, "index.html")));
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✦ PostCraft AI server → ${APP_URL}`);
  console.log(`  Environment: ${IS_PROD ? "production" : "development"}\n`);
});
