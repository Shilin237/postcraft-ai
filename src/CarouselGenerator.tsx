import { useState, useEffect, useCallback } from "react";

const TONES = ["Motivational", "Educational", "Contrarian", "Storytelling", "Punchy & Direct", "Empathetic"];

const THEMES = [
  { id: "dark",   label: "Dark",   bg: "linear-gradient(135deg,#090909 50%,#FF4D00 50%)" },
  { id: "light",  label: "Light",  bg: "linear-gradient(135deg,#F0F0F0 50%,#FF4D00 50%)" },
  { id: "blue",   label: "Blue",   bg: "linear-gradient(135deg,#0A0E1A 50%,#2563EB 50%)" },
  { id: "purple", label: "Purple", bg: "linear-gradient(135deg,#0D0D1A 50%,#9B59FF 50%)" },
];

const EXAMPLES = ["Morning routines", "AI and creativity", "Why most diets fail", "Building habits", "Stoicism for founders"];

interface HistoryItem {
  run_id: string;
  topic: string;
  theme: string;
  html_content: string;
  linkedin_summary: string;
  time: string;
}

const HISTORY_KEY = "carousel_history_v2";

function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 8)));
}

export default function CarouselGenerator() {
  const [topic, setTopic]         = useState("");
  const [audience, setAudience]   = useState("");
  const [tone, setTone]           = useState("");
  const [theme, setTheme]         = useState("dark");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "linkedin">("preview");
  const [htmlContent, setHtmlContent] = useState("");
  const [liPost, setLiPost]       = useState("");
  const [runId, setRunId]         = useState("");
  const [slideLabel, setSlideLabel] = useState("1 / 10");
  const [history, setHistory]     = useState<HistoryItem[]>(loadHistory);
  const [copied, setCopied]       = useState(false);

  const handleMessage = useCallback((e: MessageEvent) => {
    if (e.data?.type === "slide-change") {
      setSlideLabel(`${e.data.current} / ${e.data.total}`);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError("");
    setHtmlContent("");
    setLiPost("");

    try {
      const res = await fetch("/api/carousel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), audience, tone, theme }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setHtmlContent(data.html_content || "");
      setLiPost(data.linkedin_summary || "");
      setRunId(data.run_id);
      setSlideLabel("1 / 10");
      setActiveTab("preview");

      const newItem: HistoryItem = {
        run_id: data.run_id,
        topic: topic.trim(),
        theme: data.theme,
        html_content: data.html_content || "",
        linkedin_summary: data.linkedin_summary || "",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const updated = [newItem, ...history];
      setHistory(updated);
      saveHistory(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyLinkedIn = () => {
    navigator.clipboard.writeText(liPost).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadFromHistory = (item: HistoryItem) => {
    setHtmlContent(item.html_content || "");
    setLiPost(item.linkedin_summary);
    setRunId(item.run_id);
    setSlideLabel("1 / 10");
    setActiveTab("preview");
    setError("");
  };

  return (
    <>
      <style>{`
        .car-root { display: grid; grid-template-columns: 320px 1fr; min-height: calc(100vh - 48px); background: #060611; font-family: 'DM Sans', sans-serif; }
        .car-sidebar { border-right: 1px solid #1a1a2e; padding: 32px 28px; display: flex; flex-direction: column; gap: 22px; overflow-y: auto; height: calc(100vh - 48px); scrollbar-width: thin; scrollbar-color: #1e1e38 transparent; }
        .car-sidebar::-webkit-scrollbar { width: 3px; }
        .car-sidebar::-webkit-scrollbar-thumb { background: #1e1e38; border-radius: 2px; }
        .car-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; position: relative; overflow: hidden; background: #060611; }
        .car-panel::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,77,0,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,77,0,0.015) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; }
        .car-label { font-family: 'Courier New', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 2.5px; color: #444; margin-bottom: 6px; }
        .car-input { background: #0a0a1e; border: 1px solid #1a1a2e; color: #e2e0f0; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 11px 14px; border-radius: 4px; outline: none; width: 100%; transition: border-color 0.2s, box-shadow 0.2s; }
        .car-input:focus { border-color: #FF4D0055; box-shadow: 0 0 0 3px rgba(255,77,0,0.06); }
        .car-input::placeholder { color: #2e2e52; }
        .car-select { background: #0a0a1e; border: 1px solid #1a1a2e; color: #e2e0f0; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 11px 14px; border-radius: 4px; outline: none; width: 100%; cursor: pointer; }
        .car-select option { background: #0a0a1e; }
        .car-swatches { display: flex; gap: 6px; }
        .car-swatch { flex: 1; height: 34px; border-radius: 3px; border: 2px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: 'Courier New', monospace; font-size: 7px; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.8); transition: border-color 0.15s, transform 0.1s; }
        .car-swatch.active { border-color: #e2e0f0; }
        .car-swatch:hover { transform: scale(1.04); }
        .car-swatch.light-swatch { color: rgba(0,0,0,0.65); }
        .car-btn { background: #FF4D00; color: #000; font-family: 'Courier New', monospace; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; padding: 14px; border: none; border-radius: 4px; cursor: pointer; width: 100%; transition: opacity 0.2s; position: relative; }
        .car-btn:hover { opacity: 0.88; }
        .car-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .car-divider { height: 1px; background: #1a1a2e; }
        .car-error { background: rgba(255,77,0,0.06); border: 1px solid rgba(255,77,0,0.25); border-radius: 4px; padding: 11px 14px; font-size: 13px; color: #ff6644; line-height: 1.5; }
        .car-dl-btn { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border: 1px solid #1a1a2e; border-radius: 4px; color: #e2e0f0; text-decoration: none; font-size: 13px; transition: border-color 0.2s, color 0.2s; }
        .car-dl-btn:hover { border-color: #FF4D00; color: #fff; }
        .car-hist-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #1a1a2e; border-radius: 4px; cursor: pointer; transition: border-color 0.2s; }
        .car-hist-item:hover { border-color: #FF4D00; }
        .car-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; z-index: 1; }
        .car-tabs { display: flex; border-bottom: 1px solid #1a1a2e; width: 560px; max-width: 100%; z-index: 1; }
        .car-tab { font-family: 'Courier New', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #444; background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 20px; margin-bottom: -1px; cursor: pointer; transition: color 0.2s, border-color 0.2s; }
        .car-tab:hover { color: #e2e0f0; }
        .car-tab.active { color: #FF4D00; border-bottom-color: #FF4D00; }
        .car-iframe { width: 540px; height: 660px; border: none; border-radius: 4px; box-shadow: 0 0 60px rgba(255,77,0,0.12); display: block; }
        .car-counter-bar { display: flex; align-items: center; justify-content: space-between; width: 540px; margin-bottom: 6px; }
        .car-counter-hint { font-family: 'Courier New', monospace; font-size: 9px; color: #2e2e52; letter-spacing: 1px; text-transform: uppercase; }
        .car-counter { font-family: 'Courier New', monospace; font-size: 11px; color: #FF4D00; font-weight: 700; letter-spacing: 1px; }
        .car-li-box { background: #0a0a1e; border: 1px solid #1a1a2e; border-radius: 4px; padding: 24px 28px; font-size: 15px; color: #e2e0f0; line-height: 1.75; white-space: pre-wrap; min-height: 280px; word-break: break-word; width: 560px; max-width: 100%; }
        .car-copy-btn { font-family: 'Courier New', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; background: none; border: 1px solid #1a1a2e; color: #e2e0f0; padding: 9px 18px; border-radius: 4px; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
        .car-copy-btn:hover { border-color: #FF4D00; color: #FF4D00; }
        .car-copy-btn.copied { border-color: #34d399; color: #34d399; }
        .car-loading { display: flex; flex-direction: column; align-items: center; gap: 20px; z-index: 1; }
        @keyframes carSpin { to { transform: rotate(360deg); } }
        .car-spinner { width: 40px; height: 40px; border: 3px solid rgba(255,77,0,0.15); border-top-color: #FF4D00; border-radius: 50%; animation: carSpin 0.8s linear infinite; }
        .car-step { font-family: 'Courier New', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #FF4D00; }
        .car-example-chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 4px; }
        .car-chip { font-family: 'Courier New', monospace; font-size: 9px; padding: 5px 10px; border: 1px solid #1a1a2e; border-radius: 20px; color: #2e2e52; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
        .car-chip:hover { border-color: #FF4D00; color: #FF4D00; }
      `}</style>

      <div className="car-root">
        {/* ── SIDEBAR ── */}
        <aside className="car-sidebar">
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 18, letterSpacing: 2, color: "#e2e0f0", textTransform: "uppercase" }}>
            Carousel<span style={{ color: "#FF4D00" }}>.</span>
          </div>

          <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div className="car-label">Topic *</div>
              <input
                className="car-input"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Morning routines for founders"
                required
              />
            </div>

            <div>
              <div className="car-label">Target Audience <span style={{ color: "#2e2e52" }}>(optional)</span></div>
              <input
                className="car-input"
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. Startup founders, age 25–40"
              />
            </div>

            <div>
              <div className="car-label">Tone <span style={{ color: "#2e2e52" }}>(optional)</span></div>
              <select className="car-select" value={tone} onChange={e => setTone(e.target.value)}>
                <option value="">— Choose tone —</option>
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <div className="car-label">Theme</div>
              <div className="car-swatches">
                {THEMES.map(th => (
                  <div
                    key={th.id}
                    className={`car-swatch${theme === th.id ? " active" : ""}${th.id === "light" ? " light-swatch" : ""}`}
                    style={{ background: th.bg }}
                    onClick={() => setTheme(th.id)}
                  >
                    {th.label}
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="car-btn" disabled={loading}>
              {loading ? "Generating…" : "Generate Carousel"}
            </button>
          </form>

          {error && <div className="car-error">{error}</div>}

          {htmlContent && (
            <>
              <div className="car-divider" />
              <div>
                <div className="car-label" style={{ marginBottom: 10 }}>Download</div>
                <button
                  className="car-dl-btn"
                  style={{ width: "100%", cursor: "pointer", background: "none" }}
                  onClick={() => {
                    const blob = new Blob([htmlContent], { type: "text/html" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `carousel_${runId}.html`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  <span style={{ color: "#FF4D00" }}>⬡</span> Download HTML
                </button>
              </div>
            </>
          )}

          <div className="car-divider" />

          <div>
            <div className="car-label" style={{ marginBottom: 10 }}>Recent</div>
            {history.length === 0 ? (
              <div style={{ fontSize: 12, color: "#2e2e52", fontStyle: "italic" }}>No carousels yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map(item => (
                  <div key={item.run_id} className="car-hist-item" onClick={() => loadFromHistory(item)}>
                    <div style={{ width: 6, height: 6, background: "#FF4D00", borderRadius: "50%", flexShrink: 0, opacity: 0.5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#e2e0f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.topic}</div>
                      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: "#2e2e52", marginTop: 2 }}>{item.theme} · {item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── PREVIEW PANEL ── */}
        <main className="car-panel">
          {loading ? (
            <div className="car-loading">
              <div className="car-spinner" />
              <div className="car-step">Generating carousel…</div>
            </div>
          ) : !htmlContent ? (
            <div className="car-empty" style={{ zIndex: 1 }}>
              <div style={{ fontSize: 40, opacity: 0.2 }}>◈</div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#2e2e52", maxWidth: 260, lineHeight: 1.8 }}>
                Enter a topic and hit Generate.<br />Your carousel will appear here.
              </div>
              <div className="car-example-chips">
                {EXAMPLES.map(ex => (
                  <span key={ex} className="car-chip" onClick={() => setTopic(ex)}>{ex}</span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, zIndex: 1, width: "100%" }}>
              {/* Tabs */}
              <div className="car-tabs" style={{ marginBottom: 8 }}>
                <button className={`car-tab${activeTab === "preview" ? " active" : ""}`} onClick={() => setActiveTab("preview")}>Preview</button>
                <button className={`car-tab${activeTab === "linkedin" ? " active" : ""}`} onClick={() => setActiveTab("linkedin")}>LinkedIn Post</button>
              </div>

              {activeTab === "preview" && (
                <>
                  <div className="car-counter-bar">
                    <span className="car-counter-hint">← → to navigate</span>
                    <span className="car-counter">{slideLabel}</span>
                  </div>
                  <iframe
                    className="car-iframe"
                    srcDoc={htmlContent}
                    title="Carousel Preview"
                  />
                </>
              )}

              {activeTab === "linkedin" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 560, maxWidth: "100%" }}>
                  <div className="car-li-box">{liPost}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#2e2e52" }}>Ready to paste into LinkedIn</span>
                    <button className={`car-copy-btn${copied ? " copied" : ""}`} onClick={copyLinkedIn}>
                      {copied ? "Copied!" : "Copy Post"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
