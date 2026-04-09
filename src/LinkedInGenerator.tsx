import { useState, useEffect, useRef } from "react";
import { loadStore, type TopicStore } from "./topicStore";

const TONES = [
  { label: "Inspirational", emoji: "🔥", color: "#FF6B35" },
  { label: "Educational",   emoji: "🧠", color: "#6C63FF" },
  { label: "Storytelling",  emoji: "📖", color: "#F7931E" },
  { label: "Controversial", emoji: "⚡", color: "#FF3366" },
  { label: "Humorous",      emoji: "😄", color: "#FFD93D" },
  { label: "Analytical",    emoji: "📊", color: "#00C9A7" },
];

const FORMATS = [
  { label: "Hook + Story + CTA", icon: "🎣" },
  { label: "List / Tips",        icon: "📋" },
  { label: "Hot Take",           icon: "🌶️" },
  { label: "Personal Story",     icon: "💬" },
  { label: "Data-Driven",        icon: "📈" },
  { label: "Question Post",      icon: "❓" },
];

const HOOKS = [
  { label: "Bold Claim",       icon: "💥" },
  { label: "Personal Failure", icon: "😬" },
  { label: "Surprising Stat",  icon: "😲" },
  { label: "Opening Question", icon: "🤔" },
  { label: "Contrarian Take",  icon: "🔄" },
];

const IMG_STYLES = [
  {
    label: "Whiteboard Diagram", icon: "📋", color: "#6C63FF",
    prompt: "professional whiteboard diagram, hand-drawn black marker style on white background, clean educational content, clear labels, organized layout, no people",
  },
  {
    label: "Infographic", icon: "📊", color: "#00C9A7",
    prompt: "modern flat design infographic, colorful icons, professional business style, clean white background, bold typography, data visualization, minimal",
  },
  {
    label: "Mind Map", icon: "🧠", color: "#FF6B35",
    prompt: "hand-drawn mind map, colorful branches, whiteboard style, clean nodes, organized radial layout, clear readable text, white background",
  },
  {
    label: "Tech Blueprint", icon: "🔷", color: "#0a66c2",
    prompt: "technical architecture diagram, dark navy background, blue accent lines, professional tech style, system design, clean boxes and arrows, glowing elements",
  },
  {
    label: "Quote Card", icon: "💬", color: "#FF3366",
    prompt: "minimalist LinkedIn quote card, elegant typography, professional gradient background, bold quote text, modern design, centered layout, abstract geometric shapes",
  },
];

const INPUT_COST_PER_TOKEN  = 3  / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

interface Particle { id: number; x: number; y: number; size: number; color: string; }

export default function LinkedInGenerator({ storeVersion = 0 }: { storeVersion?: number }) {
  const [store, setStore] = useState<TopicStore>(loadStore);

  // Reload store when TopicManager makes changes
  useEffect(() => { setStore(loadStore()); }, [storeVersion]);

  const TOPICS   = store.topics;
  const SUBTOPICS = store.subtopics;

  const [tone,     setTone]     = useState(TONES[0]);
  const [topic,    setTopic]    = useState(() => store.topics[0] || TONES[0]);
  const [subtopic, setSubtopic] = useState<{ label: string; icon: string } | null>(null);
  const [format,   setFormat]   = useState(FORMATS[0]);
  const [hook,     setHook]     = useState(HOOKS[0]);
  const [context,  setContext]  = useState("");


  const [post,    setPost]    = useState("");
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [error,   setError]   = useState("");
  const [step,    setStep]    = useState<1 | 2>(1);

  const [totalInputTokens,  setTotalInputTokens]  = useState<number>(() => {
    const s = localStorage.getItem("li_gen_usage");
    return s ? JSON.parse(s).totalInputTokens  : 0;
  });
  const [totalOutputTokens, setTotalOutputTokens] = useState<number>(() => {
    const s = localStorage.getItem("li_gen_usage");
    return s ? JSON.parse(s).totalOutputTokens : 0;
  });
  const [requestCount, setRequestCount] = useState<number>(() => {
    const s = localStorage.getItem("li_gen_usage");
    return s ? JSON.parse(s).requestCount      : 0;
  });
  const [redoCount,   setRedoCount]   = useState(0);
  const [lastUsage,   setLastUsage]   = useState<{ input: number; output: number } | null>(null);
  const [usageOpen,   setUsageOpen]   = useState(false);
  const [budget,      setBudget]      = useState<number>(() => {
    const b = localStorage.getItem("li_gen_budget");
    return b ? parseFloat(b) : 5.00;
  });
  const [budgetDraft, setBudgetDraft] = useState("");

  interface PostRecord {
    date: string; time: string; tone: string; topic: string; subtopic: string;
    format: string; hook: string; words: number; cost: string; text: string;
  }
  const [postHistory, setPostHistory] = useState<PostRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem("li_gen_history") ?? "[]"); } catch { return []; }
  });

  // LinkedIn OAuth (preserved for future use)
  const [liConnected,   setLiConnected]   = useState(false);
  const [liName,        setLiName]        = useState("");
  const [liPosting,     setLiPosting]     = useState(false);
  const [liPostSuccess, setLiPostSuccess] = useState(false);
  const [liPostError,   setLiPostError]   = useState("");

  // Main tab: "text" | "image"
  const [mainTab, setMainTab] = useState<"text" | "image">("text");

  // Image generation state
  const [imgStyle,   setImgStyle]   = useState(IMG_STYLES[0]);
  const [imgTopic,   setImgTopic]   = useState("");
  const [imgUrl,     setImgUrl]     = useState("");
  const [imgLoading, setImgLoading] = useState(false);
  const [imgLoaded,  setImgLoaded]  = useState(false);
  const [imgError,   setImgError]   = useState("");

  const [particles, setParticles] = useState<Particle[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef   = useRef<HTMLDivElement>(null);

  // Check LinkedIn connection on mount (URL param from OAuth redirect + server status)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("li_connected") === "1") {
      const name = params.get("li_name") ?? "";
      setLiConnected(true);
      setLiName(decodeURIComponent(name));
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      fetch("/api/linkedin/status")
        .then(r => r.json())
        .then(d => { if (d.connected) { setLiConnected(true); setLiName(d.name ?? ""); } })
        .catch(() => {});
    }
  }, []);

  const connectLinkedIn    = () => { window.location.href = "/auth/linkedin"; };
  const disconnectLinkedIn = async () => {
    await fetch("/api/linkedin/disconnect", { method: "POST" }).catch(() => {});
    setLiConnected(false);
    setLiName("");
    setLiPostSuccess(false);
  };

  const postToLinkedIn = async () => {
    if (!post.trim()) return;
    setLiPosting(true);
    setLiPostError("");
    setLiPostSuccess(false);
    try {
      const res = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: post }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setLiPostSuccess(true);
    } catch (err) {
      setLiPostError((err as Error).message);
    } finally {
      setLiPosting(false);
    }
  };

  // Generate image via Pollinations.ai (free, no API key needed)
  const generateImage = async () => {
    if (!imgTopic.trim()) return;
    setImgLoading(true);
    setImgError("");
    // Revoke previous blob URL to free memory
    if (imgUrl.startsWith("blob:")) URL.revokeObjectURL(imgUrl);
    setImgUrl("");
    setImgLoaded(false);

    let finalPrompt = `${imgStyle.prompt}, topic: ${imgTopic}, high quality, professional`;

    // Enhance prompt via server (Claude Haiku — key stays on server)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 120,
          messages: [{
            role: "user",
            content: `Write a concise image generation prompt (max 40 words) for a ${imgStyle.label} style image about: "${imgTopic}". Base style: "${imgStyle.prompt}". Add specific visual details. Output ONLY the prompt text.`,
          }],
        }),
      });
      const data = await res.json();
      if (res.ok && data?.content?.[0]?.text) {
        finalPrompt = data.content[0].text.trim();
      }
    } catch {
      // Fall through to basic prompt
    }

    // Truncate prompt if too long
    if (finalPrompt.length > 400) finalPrompt = finalPrompt.slice(0, 400);

    const seed = Math.floor(Math.random() * 999999);
    // Route through Express proxy — Pollinations blocks direct browser fetch (403)
    const proxyUrl = `/api/image/generate?prompt=${encodeURIComponent(finalPrompt)}&width=1280&height=720&seed=${seed}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Pollinations returned ${res.status} — try again`);
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("Invalid response from image service");

      const blobUrl = URL.createObjectURL(blob);
      setImgUrl(blobUrl);
      setImgLoaded(true);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.toLowerCase().includes("abort")) {
        setImgError("Timed out — Pollinations.ai is busy. Try again in a moment.");
      } else {
        setImgError(msg || "Image generation failed.");
      }
    } finally {
      setImgLoading(false);
    }
  };

  const exportCSV = () => {
    if (postHistory.length === 0) return;
    const headers = ["Date", "Time", "Tone", "Topic", "Subtopic", "Format", "Hook", "Words", "Cost", "Post Text"];
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = postHistory.map(r =>
      [r.date, r.time, r.tone, r.topic, r.subtopic, r.format, r.hook, r.words, r.cost, r.text].map(escape).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "linkedin-posts-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadImage = () => {
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = "linkedin-image-post.jpg";
    a.click();
  };

  // Load Google Fonts + generate particles on mount
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap";
    document.head.appendChild(link);

    setParticles(Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 120 + Math.random() * 200,
      color: ["rgba(108,99,255,0.07)","rgba(255,107,53,0.07)","rgba(0,201,167,0.07)",
              "rgba(255,51,102,0.06)","rgba(247,147,30,0.07)","rgba(255,217,61,0.07)"][i],
    })));

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Persist usage stats across sessions
  useEffect(() => {
    localStorage.setItem("li_gen_usage", JSON.stringify({ totalInputTokens, totalOutputTokens, requestCount }));
  }, [totalInputTokens, totalOutputTokens, requestCount]);

  // Persist budget
  useEffect(() => {
    localStorage.setItem("li_gen_budget", String(budget));
  }, [budget]);

  const generate = async (isRedo = false) => {
    setError("");
    setLoading(true); setPost(""); setStep(2);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    const currentRedo = isRedo ? redoCount + 1 : 0;
    if (isRedo) setRedoCount(r => r + 1);

    const variationNote = isRedo
      ? `\nIMPORTANT: This is variation #${currentRedo}. Write a COMPLETELY DIFFERENT post — use a different hook, different angle, different structure, different opening line, and different examples than any previous version. Do not reuse the same opening words or story.`
      : "";

    const prompt = `You are an elite LinkedIn ghostwriter. Write viral, authentic posts.
First person. Human and punchy. Never corporate. Max 3 hashtags.
Short paragraphs. Generous line breaks.
Add relevant emojis naturally throughout — at the start of key lines, bullet points, or to emphasize important ideas. Do not overdo it; use emojis where they add clarity or energy.

Post specs:
- Tone: ${tone.label}
- Topic: ${topic.label}${subtopic ? `\n- Subtopic: ${subtopic.icon} ${subtopic.label}` : ""}
- Format: ${format.label}
- Hook: ${hook.label}
${context ? `- Personal angle: ${context}` : ""}

150–300 words. Hook = first line. End with soft CTA.${variationNote}

After writing, proofread carefully:
- Fix any grammar or spelling mistakes
- Ensure smooth flow and readability
- Confirm emojis are placed naturally

Output ONLY the final proofread post text.`;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);

      const text: string | undefined = data?.content?.[0]?.text?.trim();
      if (!text) throw new Error("Empty response. Try again.");

      const inputTokens: number  = data?.usage?.input_tokens  ?? 0;
      const outputTokens: number = data?.usage?.output_tokens ?? 0;
      setLastUsage({ input: inputTokens, output: outputTokens });
      setTotalInputTokens(p  => p + inputTokens);
      setTotalOutputTokens(p => p + outputTokens);
      setRequestCount(p => p + 1);

      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString();
      const postCost = `$${((inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN)).toFixed(5)}`;

      let i = 0;
      intervalRef.current = setInterval(() => {
        if (i <= text.length) { setPost(text.slice(0, i)); i += 5; }
        else {
          clearInterval(intervalRef.current!);
          setPost(text);
          setLoading(false);
          const record: PostRecord = {
            date: dateStr, time: timeStr,
            tone: tone.label, topic: topic.label,
            subtopic: subtopic ? `${subtopic.icon} ${subtopic.label}` : "",
            format: format.label, hook: hook.label,
            words: text.split(/\s+/).filter(Boolean).length,
            cost: postCost, text,
          };
          setPostHistory(prev => {
            const updated = [record, ...prev];
            localStorage.setItem("li_gen_history", JSON.stringify(updated));
            return updated;
          });
        }
      }, 10);
    } catch (err) {
      const e = err as Error;
      setError(e.message);
      setLoading(false);
      setStep(1);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(post);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const accentColor = tone.color;
  const words = post.split(/\s+/).filter(Boolean).length;
  const score = Math.min(99, 60 + (words > 100 ? 10 : 0) + (words < 300 ? 10 : 0) + (post.includes("?") ? 10 : 0) + (post.split("\n").length > 4 ? 10 : 0));
  const totalCost = (totalInputTokens * INPUT_COST_PER_TOKEN) + (totalOutputTokens * OUTPUT_COST_PER_TOKEN);

  // Suppress unused-var warnings for LinkedIn OAuth state (kept for future use)
  void liPosting; void liPostSuccess; void liPostError; void postToLinkedIn; void budgetDraft;

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0D", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#fff", position: "relative", overflow: "hidden" }}>

      <style>{`
        /* ── Responsive: iPad Air 5 (820px portrait) ── */
        @media (max-width: 860px) {
          .app-header { padding: 14px 20px !important; }
          .tab-content { padding: 24px 20px !important; }
          .usage-modal-box { max-width: calc(100% - 32px) !important; }
          .format-hook-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
        }
        /* ── Responsive: iPhone 14 Pro Max (430px) ── */
        @media (max-width: 480px) {
          .app-header {
            padding: 10px 14px !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .header-actions {
            flex-wrap: wrap !important;
            gap: 5px !important;
            width: 100% !important;
          }
          .header-actions > button {
            padding: 6px 10px !important;
            font-size: 10px !important;
          }
          .header-subtitle { display: none !important; }
          .tab-content { padding: 14px !important; }
          .usage-modal-box {
            margin: 10px !important;
            border-radius: 16px !important;
            max-width: calc(100% - 20px) !important;
          }
          .usage-modal-box > div { padding: 16px !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .format-hook-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          textarea, input { font-size: 16px !important; } /* prevent iOS zoom */
        }
      `}</style>
      {/* Floating BG blobs */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: "fixed", borderRadius: "50%",
          width: p.size, height: p.size,
          left: `${p.x}%`, top: `${p.y}%`,
          background: p.color, filter: "blur(60px)",
          pointerEvents: "none", zIndex: 0,
          animation: `float${p.id % 3} ${8 + p.id * 2}s ease-in-out infinite alternate`,
        }} />
      ))}

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="app-header" style={{ padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)", background: "rgba(13,13,13,0.6)" }}>
          <div
            onClick={() => { setMainTab("text"); setStep(1); }}
            style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `linear-gradient(135deg, ${tone.color}, ${topic.color})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", transition: "all 0.4s" }}>
              {tone.emoji}
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px" }}>
                PostCraft <span style={{ color: accentColor }}>AI</span>
              </div>
              <div className="header-subtitle" style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>LinkedIn Post Generator · Claude Sonnet 4.6</div>
            </div>
          </div>

          <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>

            {/* Main mode tabs */}
            {/* Image Post tab temporarily disabled */}
            <button onClick={() => setMainTab("text")} style={{
              padding: "8px 18px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600,
              background: accentColor, color: "#fff",
              transition: "all 0.3s", fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              ✍️ Text Post
            </button>

            {/* Step tabs (text mode only) */}
            {mainTab === "text" && ([1, 2] as const).map(s => (
              <button key={s} onClick={() => s === 1 ? setStep(1) : (post && setStep(2))} style={{
                padding: "8px 18px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600,
                background: step === s ? accentColor : "rgba(255,255,255,0.08)",
                color: step === s ? "#fff" : "rgba(255,255,255,0.5)",
                transition: "all 0.3s", fontFamily: "'Plus Jakarta Sans', sans-serif",
                opacity: s === 2 && !post ? 0.4 : 1,
              }}>
                {s === 1 ? "⚙️ Configure" : "✨ Preview"}
              </button>
            ))}

            {/* LinkedIn connect button */}
            {liConnected ? (
              <button onClick={disconnectLinkedIn} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "20px",
                background: "rgba(10,102,194,0.15)", border: "1px solid rgba(10,102,194,0.4)",
                color: "#60a5fa", fontSize: "12px", fontWeight: 600,
                cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                {liName || "Connected"} · Disconnect
              </button>
            ) : (
              <button onClick={connectLinkedIn} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "20px",
                background: "rgba(10,102,194,0.12)", border: "1px solid rgba(10,102,194,0.3)",
                color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 600,
                cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                Connect LinkedIn
              </button>
            )}

            {/* Usage button */}
            <button onClick={() => setUsageOpen(true)} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: "20px",
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: 600,
              cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s",
            }}>
              📊 Usage
            </button>

          </div>
        </div>

        {/* ── Usage Modal ── */}
        {usageOpen && (() => {
          const totalCostSoFar = (totalInputTokens * INPUT_COST_PER_TOKEN) + (totalOutputTokens * OUTPUT_COST_PER_TOKEN);
          const avgCostPerPost = requestCount > 0 ? totalCostSoFar / requestCount : 0.006;
          const remaining      = Math.max(0, budget - totalCostSoFar);
          const postsLeft      = Math.floor(remaining / avgCostPerPost);
          const pctUsed        = Math.min(100, (totalCostSoFar / budget) * 100);
          const barColor       = pctUsed > 80 ? "#FF3366" : pctUsed > 50 ? "#FFD93D" : "#00C9A7";

          return (
            <div onClick={() => setUsageOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div onClick={e => e.stopPropagation()} className="usage-modal-box" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px", width: "100%", maxWidth: "520px", boxShadow: "0 40px 100px rgba(0,0,0,0.9)", animation: "modalIn 0.25s ease", overflow: "hidden" }}>

                {/* Header */}
                <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "18px" }}>📊 Usage Dashboard</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "3px" }}>Stats persist across sessions</div>
                  </div>
                  <button onClick={() => setUsageOpen(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "20px", cursor: "pointer" }}>✕</button>
                </div>

                <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "20px" }}>

                  {/* Budget bar */}
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "2px", color: "rgba(255,255,255,0.4)" }}>BUDGET USED</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: barColor }}>${totalCostSoFar.toFixed(4)} / ${budget.toFixed(2)}</span>
                    </div>
                    <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pctUsed}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`, borderRadius: "4px", transition: "width 0.6s ease", boxShadow: `0 0 10px ${barColor}88` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{pctUsed.toFixed(1)}% used</span>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>${remaining.toFixed(4)} remaining</span>
                    </div>
                  </div>

                  {/* Big number: posts remaining */}
                  <div style={{ background: `linear-gradient(135deg, rgba(0,201,167,0.12), rgba(108,99,255,0.12))`, borderRadius: "16px", padding: "20px", border: "1px solid rgba(0,201,167,0.2)", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "52px", fontWeight: 800, color: "#00C9A7", lineHeight: 1 }}>
                      {requestCount === 0 ? "~833" : postsLeft.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "6px" }}>
                      {requestCount === 0 ? "estimated posts remaining (based on $5 budget)" : "posts you can still generate"}
                    </div>
                    {requestCount > 0 && (
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                        avg ${avgCostPerPost.toFixed(5)} per post based on your usage
                      </div>
                    )}
                  </div>

                  {/* Stats grid */}
                  <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    {[
                      { label: "Posts Generated", value: requestCount.toLocaleString(),            color: "#6C63FF", icon: "✍️" },
                      { label: "Input Tokens",     value: totalInputTokens.toLocaleString(),        color: "#F7931E", icon: "📥" },
                      { label: "Output Tokens",    value: totalOutputTokens.toLocaleString(),       color: "#FF6B35", icon: "📤" },
                      { label: "Total Tokens",     value: (totalInputTokens + totalOutputTokens).toLocaleString(), color: "#FFD93D", icon: "🔢" },
                      { label: "Total Spent",      value: `$${totalCostSoFar.toFixed(5)}`,          color: "#FF3366", icon: "💰" },
                      { label: "Avg / Post",       value: requestCount > 0 ? `$${avgCostPerPost.toFixed(5)}` : "—", color: "#00C9A7", icon: "📊" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "12px 14px", border: `1px solid ${s.color}22` }}>
                        <div style={{ fontSize: "16px", marginBottom: "4px" }}>{s.icon}</div>
                        <div style={{ fontSize: "14px", fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif" }}>{s.value}</div>
                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.5px", marginTop: "2px" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Budget input */}
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "16px 18px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2px", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>SET YOUR BUDGET</div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px", fontWeight: 700 }}>$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        defaultValue={budget}
                        onChange={e => setBudgetDraft(e.target.value)}
                        style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "10px 14px", color: "#fff", fontSize: "15px", fontWeight: 700, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      />
                      <button
                        onClick={() => { const v = parseFloat(budgetDraft); if (!isNaN(v) && v > 0) setBudget(v); }}
                        style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: "#6C63FF", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap" }}
                      >
                        Set
                      </button>
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                      Quick set: {[1, 5, 10, 25].map(v => (
                        <button key={v} onClick={() => setBudget(v)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", cursor: "pointer", marginLeft: "6px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          ${v}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Footer */}
                <div style={{ padding: "14px 28px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => { if (confirm("Reset all usage stats?")) { setTotalInputTokens(0); setTotalOutputTokens(0); setRequestCount(0); setLastUsage(null); localStorage.removeItem("li_gen_usage"); } }}
                    style={{ padding: "9px 16px", borderRadius: "10px", border: "1px solid rgba(255,51,102,0.3)", background: "transparent", color: "#ff6688", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    🗑 Reset Stats
                  </button>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      onClick={exportCSV}
                      disabled={postHistory.length === 0}
                      title={postHistory.length === 0 ? "No posts yet" : `Export ${postHistory.length} post${postHistory.length !== 1 ? "s" : ""} to CSV`}
                      style={{ padding: "9px 16px", borderRadius: "10px", border: "1px solid rgba(0,201,167,0.4)", background: "rgba(0,201,167,0.08)", color: postHistory.length === 0 ? "rgba(255,255,255,0.2)" : "#00C9A7", fontSize: "12px", fontWeight: 600, cursor: postHistory.length === 0 ? "not-allowed" : "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      📥 Export CSV {postHistory.length > 0 && <span style={{ background: "rgba(0,201,167,0.2)", borderRadius: "6px", padding: "1px 7px", fontSize: "11px" }}>{postHistory.length}</span>}
                    </button>
                    <button onClick={() => setUsageOpen(false)} style={{ padding: "9px 22px", borderRadius: "10px", border: "none", background: "#6C63FF", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Done
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════
            IMAGE POST TAB
        ══════════════════════════════════════════════ */}
        {mainTab === "image" && (
          <div className="tab-content" style={{ padding: "36px 40px", maxWidth: "900px", margin: "0 auto" }}>

            {/* Style selector */}
            <ConfigSection label="IMAGE STYLE" emoji="🎨">
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {IMG_STYLES.map(s => (
                  <button key={s.label} onClick={() => setImgStyle(s)} style={{
                    padding: "16px 20px", borderRadius: "14px", border: "2px solid",
                    borderColor: imgStyle.label === s.label ? s.color : "rgba(255,255,255,0.1)",
                    background: imgStyle.label === s.label ? `${s.color}22` : "rgba(255,255,255,0.04)",
                    color: imgStyle.label === s.label ? s.color : "rgba(255,255,255,0.6)",
                    cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600, fontSize: "14px", transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: "8px",
                    transform: imgStyle.label === s.label ? "scale(1.05)" : "scale(1)",
                  }}>
                    <span style={{ fontSize: "22px" }}>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </ConfigSection>

            {/* Topic input */}
            <ConfigSection label="WHAT SHOULD THE IMAGE BE ABOUT?" emoji="💡">
              <textarea
                value={imgTopic}
                onChange={e => setImgTopic(e.target.value)}
                placeholder={`e.g. "AI agent authentication — from hardcoded keys to identity layers"\nor "5 habits of the most productive remote workers"`}
                onFocus={e => (e.target.style.borderColor = imgStyle.color)}
                onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "16px 20px", color: "#fff", fontSize: "14px", fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "vertical", minHeight: "100px", outline: "none", lineHeight: "1.7", boxSizing: "border-box", transition: "border-color 0.2s" }}
              />
              <div style={{ marginTop: "10px", fontSize: "12px", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "#34d399" }}>✦</span> Claude will craft an optimized image prompt · Powered by Pollinations.ai FLUX (free)
              </div>
            </ConfigSection>

            {/* Generate button */}
            <button
              onClick={generateImage}
              disabled={imgLoading || !imgTopic.trim()}
              style={{
                width: "100%", padding: "20px", borderRadius: "16px", border: "none",
                background: (imgLoading || !imgTopic.trim()) ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${imgStyle.color}, #FF6B35)`,
                color: (imgLoading || !imgTopic.trim()) ? "rgba(255,255,255,0.4)" : "#fff",
                fontSize: "16px", fontWeight: 800, fontFamily: "'Syne', sans-serif",
                letterSpacing: "1px", cursor: (imgLoading || !imgTopic.trim()) ? "not-allowed" : "pointer",
                transition: "all 0.3s", boxShadow: (imgLoading || !imgTopic.trim()) ? "none" : `0 8px 32px ${imgStyle.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                marginBottom: "32px",
              }}
            >
              {imgLoading ? <><Spinner /> Generating image...</> : <>🖼️ Generate Image</>}
            </button>

            {/* Image output area */}
            {(imgLoading || imgLoaded || imgError) && (
              <div>
                {/* Skeleton while loading */}
                {imgLoading && (
                  <div style={{
                    background: "rgba(255,255,255,0.04)", borderRadius: "16px",
                    height: "360px", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: "16px",
                    border: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px",
                  }}>
                    <div style={{ fontSize: "52px", animation: "spin 3s linear infinite", display: "inline-block" }}>🎨</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "18px", fontWeight: 700, color: imgStyle.color }}>Generating your image...</div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Pollinations.ai · FLUX model · usually 15–30s</div>
                  </div>
                )}

                {imgError && !imgLoading && (
                  <div style={{ background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.4)", borderRadius: "12px", padding: "14px 20px", color: "#ff6688", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <span>⚠️ {imgError}</span>
                    <button onClick={generateImage} style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: "#ff3366", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap" }}>
                      Try Again
                    </button>
                  </div>
                )}

                {/* The actual generated image */}
                {imgLoaded && (
                  <img
                    src={imgUrl}
                    alt="Generated LinkedIn post image"
                    style={{
                      display: "block",
                      width: "100%", borderRadius: "16px",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
                      marginBottom: "16px",
                    }}
                  />
                )}

                {/* Action buttons */}
                {imgLoaded && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <button
                        onClick={downloadImage}
                        style={{
                          padding: "16px 24px", borderRadius: "14px", border: "none",
                          background: `linear-gradient(135deg, ${imgStyle.color}, #FF6B35)`,
                          color: "#fff", fontSize: "15px", fontWeight: 700,
                          cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                          transition: "all 0.25s", boxShadow: `0 4px 20px ${imgStyle.color}44`,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        }}
                      >
                        ⬇️ Download Image
                      </button>
                      <button
                        onClick={generateImage}
                        style={{
                          padding: "16px 24px", borderRadius: "14px",
                          border: "2px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.06)", color: "#fff",
                          fontSize: "15px", fontWeight: 600,
                          cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        ↺ Regenerate
                      </button>
                    </div>

                    {/* LinkedIn posting tip */}
                    <div style={{
                      background: "rgba(10,102,194,0.1)", border: "1px solid rgba(10,102,194,0.25)",
                      borderRadius: "12px", padding: "14px 18px",
                      fontSize: "13px", color: "rgba(255,255,255,0.6)",
                      display: "flex", alignItems: "flex-start", gap: "12px",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a66c2" style={{ flexShrink: 0, marginTop: "1px" }}>
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <span>
                        <strong style={{ color: "#fff" }}>How to post on LinkedIn:</strong> Download the image &rarr; Go to LinkedIn &rarr; Create a post &rarr; Upload the image &rarr; Add your caption from the <strong style={{ color: "#fff" }}>✍️ Text Post</strong> tab
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TEXT POST TAB
        ══════════════════════════════════════════════ */}
        {mainTab === "text" && (
          <>
            {/* ── STEP 1: Configure ── */}
            {step === 1 && (
              <div className="tab-content" style={{ padding: "36px 40px", maxWidth: "1200px", margin: "0 auto" }}>

                <ConfigSection label="TONE OF VOICE" emoji="🎭">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {TONES.map(t => (
                      <button key={t.label} onClick={() => setTone(t)} style={{
                        padding: "12px 20px", borderRadius: "14px", border: "2px solid",
                        borderColor: tone.label === t.label ? t.color : "rgba(255,255,255,0.1)",
                        background: tone.label === t.label ? `${t.color}22` : "rgba(255,255,255,0.04)",
                        color: tone.label === t.label ? t.color : "rgba(255,255,255,0.6)",
                        cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 600, fontSize: "14px", transition: "all 0.2s",
                        display: "flex", alignItems: "center", gap: "8px",
                        transform: tone.label === t.label ? "scale(1.05)" : "scale(1)",
                      }}>
                        <span style={{ fontSize: "18px" }}>{t.emoji}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </ConfigSection>

                <ConfigSection label="TOPIC" emoji="📌">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                    {TOPICS.map(t => (
                      <button key={t.label} onClick={() => { setTopic(t); setSubtopic(null); }} style={{
                        padding: "14px 16px", borderRadius: "14px", border: "2px solid",
                        borderColor: topic.label === t.label ? t.color : "rgba(255,255,255,0.1)",
                        background: topic.label === t.label ? `${t.color}22` : "rgba(255,255,255,0.04)",
                        color: topic.label === t.label ? t.color : "rgba(255,255,255,0.6)",
                        cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 600, fontSize: "13px", transition: "all 0.2s",
                        display: "flex", alignItems: "center", gap: "8px",
                        transform: topic.label === t.label ? "scale(1.03)" : "scale(1)",
                      }}>
                        <span style={{ fontSize: "20px" }}>{t.emoji}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </ConfigSection>

                {/* Subtopic selector — shown when selected topic has subtopics */}
                {SUBTOPICS[topic.label] && (
                  <ConfigSection label="SUBTOPIC" emoji="🎯">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      <button
                        onClick={() => setSubtopic(null)}
                        style={{
                          padding: "9px 16px", borderRadius: "20px", border: "2px solid",
                          borderColor: !subtopic ? topic.color : "rgba(255,255,255,0.1)",
                          background: !subtopic ? `${topic.color}22` : "rgba(255,255,255,0.04)",
                          color: !subtopic ? topic.color : "rgba(255,255,255,0.5)",
                          cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 600, fontSize: "12px", transition: "all 0.2s",
                        }}
                      >
                        All / General
                      </button>
                      {SUBTOPICS[topic.label].map(s => (
                        <button key={s.label} onClick={() => setSubtopic(s)} style={{
                          padding: "9px 16px", borderRadius: "20px", border: "2px solid",
                          borderColor: subtopic?.label === s.label ? topic.color : "rgba(255,255,255,0.1)",
                          background: subtopic?.label === s.label ? `${topic.color}22` : "rgba(255,255,255,0.04)",
                          color: subtopic?.label === s.label ? topic.color : "rgba(255,255,255,0.5)",
                          cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 600, fontSize: "12px", transition: "all 0.2s",
                          display: "flex", alignItems: "center", gap: "6px",
                        }}>
                          <span>{s.icon}</span> {s.label}
                        </button>
                      ))}
                    </div>
                  </ConfigSection>
                )}

                <div className="format-hook-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                  <ConfigSection label="FORMAT" emoji="📝">
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {FORMATS.map(f => (
                        <button key={f.label} onClick={() => setFormat(f)} style={{
                          padding: "13px 18px", borderRadius: "12px", border: "2px solid",
                          borderColor: format.label === f.label ? accentColor : "rgba(255,255,255,0.08)",
                          background: format.label === f.label ? `${accentColor}18` : "rgba(255,255,255,0.03)",
                          color: format.label === f.label ? "#fff" : "rgba(255,255,255,0.5)",
                          cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: format.label === f.label ? 700 : 500, fontSize: "13px",
                          transition: "all 0.2s", textAlign: "left",
                          display: "flex", alignItems: "center", gap: "10px",
                        }}>
                          <span style={{ fontSize: "18px" }}>{f.icon}</span> {f.label}
                        </button>
                      ))}
                    </div>
                  </ConfigSection>

                  <ConfigSection label="OPENING HOOK" emoji="🎣">
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {HOOKS.map(h => (
                        <button key={h.label} onClick={() => setHook(h)} style={{
                          padding: "13px 18px", borderRadius: "12px", border: "2px solid",
                          borderColor: hook.label === h.label ? accentColor : "rgba(255,255,255,0.08)",
                          background: hook.label === h.label ? `${accentColor}18` : "rgba(255,255,255,0.03)",
                          color: hook.label === h.label ? "#fff" : "rgba(255,255,255,0.5)",
                          cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: hook.label === h.label ? 700 : 500, fontSize: "13px",
                          transition: "all 0.2s", textAlign: "left",
                          display: "flex", alignItems: "center", gap: "10px",
                        }}>
                          <span style={{ fontSize: "18px" }}>{h.icon}</span> {h.label}
                        </button>
                      ))}
                    </div>
                  </ConfigSection>
                </div>

                <ConfigSection label="YOUR PERSONAL ANGLE" emoji="💬">
                  <textarea
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    placeholder="Share a personal story, specific experience, or unique angle you want woven in..."
                    onFocus={e => (e.target.style.borderColor = accentColor)}
                    onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "16px 20px", color: "#fff", fontSize: "14px", fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "vertical", minHeight: "90px", outline: "none", lineHeight: "1.7", boxSizing: "border-box", transition: "border-color 0.2s" }}
                  />
                </ConfigSection>

                {error && (
                  <div style={{ background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.4)", borderRadius: "12px", padding: "14px 20px", color: "#ff6688", fontSize: "13px", marginBottom: "24px" }}>
                    ⚠️ {error}
                  </div>
                )}

                <button onClick={() => generate()} disabled={loading} style={{
                  width: "100%", padding: "20px", borderRadius: "16px", border: "none",
                  background: loading ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${tone.color}, ${topic.color})`,
                  color: loading ? "rgba(255,255,255,0.4)" : "#fff",
                  fontSize: "16px", fontWeight: 800, fontFamily: "'Syne', sans-serif",
                  letterSpacing: "1px", cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s", boxShadow: loading ? "none" : `0 8px 32px ${tone.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                }}>
                  {loading
                    ? <><Spinner /> Crafting your post...</>
                    : <>{tone.emoji} Generate Post {topic.emoji}</>
                  }
                </button>
              </div>
            )}

            {/* ── STEP 2: Preview ── */}
            {step === 2 && (
              <div ref={resultRef} className="tab-content" style={{ padding: "36px 40px", maxWidth: "800px", margin: "0 auto" }}>

                {/* Config summary pills */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "28px" }}>
                  {[`${tone.emoji} ${tone.label}`, `${topic.emoji} ${topic.label}`, ...(subtopic ? [`${subtopic.icon} ${subtopic.label}`] : []), `${format.icon} ${format.label}`, `${hook.icon} ${hook.label}`].map((tag, i) => (
                    <div key={i} style={{ padding: "6px 14px", borderRadius: "20px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                      {tag}
                    </div>
                  ))}
                  <button onClick={() => setStep(1)} style={{ padding: "6px 14px", borderRadius: "20px", background: "none", border: `1px solid ${accentColor}66`, fontSize: "12px", fontWeight: 600, color: accentColor, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    ✏️ Edit Settings
                  </button>
                </div>

                {/* Loading skeleton */}
                {loading && !post && (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <div style={{ fontSize: "48px", marginBottom: "20px", animation: "spin 2s linear infinite", display: "inline-block" }}>{tone.emoji}</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: accentColor, fontFamily: "'Syne', sans-serif", marginBottom: "8px" }}>Crafting your post...</div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Powered by Claude Sonnet 4.6</div>
                  </div>
                )}

                {post && (
                  <>
                    {/* Stats bar */}
                    <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
                      {[
                        { label: "Words",      value: words,           color: accentColor   },
                        { label: "Characters", value: post.length,     color: topic.color   },
                        { label: "Read Time",  value: `${Math.max(1, Math.round(words / 200))}m`, color: "#00C9A7" },
                        { label: "Score",      value: `${score}/99`,   color: "#FFD93D"     },
                      ].map(s => (
                        <div key={s.label} style={{ flex: 1, minWidth: "90px", background: "rgba(255,255,255,0.05)", border: `1px solid ${s.color}33`, borderRadius: "12px", padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ fontSize: "20px", fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif" }}>{s.value}</div>
                          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", marginTop: "3px" }}>{s.label.toUpperCase()}</div>
                        </div>
                      ))}
                      {requestCount > 0 && (
                        <div style={{ flex: 1, minWidth: "90px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(168,139,250,0.3)", borderRadius: "12px", padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ fontSize: "14px", fontWeight: 800, color: "#a78bfa", fontFamily: "'Syne', sans-serif" }}>${totalCost.toFixed(5)}</div>
                          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", marginTop: "3px" }}>API COST</div>
                          {lastUsage && <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", marginTop: "2px" }}>{lastUsage.input}↑ {lastUsage.output}↓</div>}
                        </div>
                      )}
                    </div>

                    {/* LinkedIn Preview Card */}
                    <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)`, marginBottom: "20px", border: "1px solid rgba(0,0,0,0.12)" }}>
                      <div style={{ height: "4px", background: `linear-gradient(90deg, ${tone.color}, ${topic.color})` }} />

                      <div style={{ padding: "14px 16px 0" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: `linear-gradient(135deg, ${tone.color}, ${topic.color})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                            {tone.emoji}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, fontSize: "14px", color: "#1d2226", fontFamily: "-apple-system, system-ui, sans-serif", cursor: "pointer" }}>Your Name</span>
                              <span style={{ fontSize: "13px", color: "rgba(0,0,0,0.55)", fontFamily: "-apple-system, sans-serif" }}>· 1st</span>
                              <button style={{ marginLeft: "4px", background: "transparent", border: "none", color: "#0a66c2", fontSize: "14px", fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "-apple-system, sans-serif" }}>+ Follow</button>
                            </div>
                            <div style={{ fontSize: "12px", color: "rgba(0,0,0,0.6)", fontFamily: "-apple-system, sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Your Professional Headline Here</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", color: "rgba(0,0,0,0.55)", fontFamily: "-apple-system, sans-serif", marginTop: "1px" }}>
                              <span>Just now</span>
                              <span>·</span>
                              <svg viewBox="0 0 16 16" width="12" height="12" fill="rgba(0,0,0,0.5)">
                                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 011.063-3.554L6.5 8.414V9.5a.5.5 0 00.146.354l2 2A.5.5 0 009 12v1.975A6.504 6.504 0 011.5 8zm7.5 6.475V13a.5.5 0 00-.146-.354l-2-2A.5.5 0 006.5 10v-1.086L2.937 4.99A6.5 6.5 0 0114.5 8a6.504 6.504 0 01-5.5 6.475z" />
                              </svg>
                            </div>
                          </div>
                          <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.55)", fontSize: "20px", padding: "2px 6px", borderRadius: "50%", lineHeight: 1 }}>···</button>
                        </div>
                      </div>

                      <div style={{ padding: "10px 16px 14px", fontSize: "14px", lineHeight: "1.6", color: "#1d2226", whiteSpace: "pre-wrap", fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', sans-serif", wordBreak: "break-word" }}>
                        {post}
                        {loading && <span style={{ display: "inline-block", width: "2px", height: "15px", background: accentColor, marginLeft: "2px", animation: "blink 0.8s infinite", verticalAlign: "middle" }} />}
                      </div>

                      {!loading && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 16px 8px", fontFamily: "-apple-system, sans-serif" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <span style={{ fontSize: "14px" }}>👍</span>
                              <span style={{ fontSize: "14px" }}>❤️</span>
                              <span style={{ fontSize: "14px" }}>💡</span>
                              <span style={{ fontSize: "12px", color: "rgba(0,0,0,0.6)", marginLeft: "4px" }}>47</span>
                            </div>
                            <span style={{ fontSize: "12px", color: "rgba(0,0,0,0.6)", cursor: "pointer" }}>8 comments · 3 reposts</span>
                          </div>

                          <div style={{ height: "1px", background: "rgba(0,0,0,0.1)", margin: "0 8px" }} />

                          <div style={{ display: "flex", padding: "2px 8px 6px" }}>
                            {[
                              { label: "Like",    svg: <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /> },
                              { label: "Comment", svg: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
                              { label: "Repost",  svg: <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></> },
                              { label: "Send",    svg: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></> },
                            ].map(btn => (
                              <button key={btn.label} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", background: "transparent", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.6)", fontSize: "13px", fontWeight: 600, fontFamily: "-apple-system, sans-serif", padding: "10px 4px", borderRadius: "4px" }}>
                                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{btn.svg}</svg>
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Character bar */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "6px" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (post.length / 3000) * 100)}%`, background: `linear-gradient(90deg, ${tone.color}, ${topic.color})`, borderRadius: "2px", transition: "width 0.4s ease" }} />
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{post.length} / 3000 LinkedIn limit</div>
                    </div>

                    {/* Action buttons */}
                    {!loading && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", marginBottom: "12px" }}>
                          <button onClick={copy} style={{ padding: "16px 24px", borderRadius: "14px", border: "none", background: copied ? "#00C9A7" : `linear-gradient(135deg, ${tone.color}, ${topic.color})`, color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.25s", boxShadow: `0 4px 20px ${copied ? "#00C9A744" : tone.color + "44"}`, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                            {copied ? "✅ Copied!" : "📋 Copy Post"}
                          </button>
                          <button onClick={() => generate(true)} style={{ padding: "16px 20px", borderRadius: "14px", border: "2px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>↺ Refresh</button>
                          <button onClick={() => setStep(1)} style={{ padding: "16px 20px", borderRadius: "14px", border: "2px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>✏️ Edit</button>
                        </div>

                        {/* Open in LinkedIn button */}
                        <button
                          onClick={() => window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(post)}`, "_blank")}
                          style={{
                            width: "100%", padding: "16px 24px", borderRadius: "14px", border: "none",
                            background: "#0a66c2", color: "#fff", fontSize: "15px", fontWeight: 700,
                            cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.25s",
                            boxShadow: "0 4px 20px rgba(10,102,194,0.4)",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          Open in LinkedIn
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

      </div>

      <style>{`
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes float0   { from{transform:translateY(0px)} to{transform:translateY(-30px)} }
        @keyframes float1   { from{transform:translateY(0px)} to{transform:translateY(20px)} }
        @keyframes float2   { from{transform:translateY(0px)} to{transform:translateY(-20px)} }
        @keyframes modalIn  { from{opacity:0;transform:scale(0.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        * { box-sizing: border-box; }
        button:hover:not(:disabled) { filter: brightness(1.1); }
        button:active:not(:disabled) { transform: translateY(0px) !important; }
        ::selection { background: #6C63FF; color: #fff; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d0d0d; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}

function ConfigSection({ label, emoji, children }: { label: string; emoji: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ fontSize: "16px" }}>{emoji}</span>
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "3px", color: "rgba(255,255,255,0.4)" }}>{label}</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
      </div>
      {children}
    </div>
  );
}

function Spinner() {
  return <div style={{ width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}
