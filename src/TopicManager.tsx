import { useState, useRef } from "react";
import {
  loadStore, saveStore, resetStore, exportToExcel, importFromExcel, getNextColor,
  type TopicStore, type Topic, type Subtopic,
} from "./topicStore";

const EMOJI_OPTIONS = ["📌","💡","🚀","📊","🎯","💰","🧠","📚","⚡","🏆","🌱","💼","🔥","🎤","📰","📜","🏦","💸","📈","🗓️","💻","🤖","✨","🦾","⚙️","🔮","⚖️","💬","👥","❤️","🌐","🔭","🔍","📄","🔄","🛠️","📒"];

interface Props {
  onStoreChange: () => void;
}

export default function TopicManager({ onStoreChange }: Props) {
  const [store, setStore]         = useState<TopicStore>(loadStore);
  const [selectedTopic, setSelected] = useState<string | null>(null);
  const [newTopicLabel, setNewTopicLabel] = useState("");
  const [newTopicEmoji, setNewTopicEmoji] = useState("📌");
  const [newSubLabel, setNewSubLabel]     = useState("");
  const [newSubIcon, setNewSubIcon]       = useState("📌");
  const [toast, setToast]         = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const persist = (next: TopicStore) => {
    saveStore(next);
    setStore(next);
    onStoreChange();
  };

  // ── Topic actions ──
  const addTopic = () => {
    const label = newTopicLabel.trim();
    if (!label) return;
    if (store.topics.find(t => t.label === label)) return showToast("Topic already exists.");
    const next: TopicStore = {
      topics: [...store.topics, { label, emoji: newTopicEmoji, color: getNextColor(store.topics) }],
      subtopics: { ...store.subtopics, [label]: [] },
    };
    persist(next);
    setNewTopicLabel("");
    setNewTopicEmoji("📌");
    showToast(`"${label}" added.`);
  };

  const removeTopic = (label: string) => {
    const { [label]: _, ...rest } = store.subtopics;
    persist({ topics: store.topics.filter(t => t.label !== label), subtopics: rest });
    if (selectedTopic === label) setSelected(null);
    showToast(`"${label}" removed.`);
  };

  // ── Subtopic actions ──
  const addSubtopic = () => {
    if (!selectedTopic) return;
    const label = newSubLabel.trim();
    if (!label) return;
    const existing = store.subtopics[selectedTopic] || [];
    if (existing.find(s => s.label === label)) return showToast("Subtopic already exists.");
    persist({
      ...store,
      subtopics: { ...store.subtopics, [selectedTopic]: [...existing, { label, icon: newSubIcon }] },
    });
    setNewSubLabel("");
    setNewSubIcon("📌");
    showToast(`"${label}" added.`);
  };

  const removeSubtopic = (topic: string, subLabel: string) => {
    persist({
      ...store,
      subtopics: { ...store.subtopics, [topic]: (store.subtopics[topic] || []).filter(s => s.label !== subLabel) },
    });
    showToast(`"${subLabel}" removed.`);
  };

  // ── Excel ──
  const handleExport = () => { exportToExcel(store); showToast("Exported to postcraft_topics.xlsx"); };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const next = await importFromExcel(file);
      setStore(next);
      onStoreChange();
      setSelected(null);
      showToast("Imported successfully.");
    } catch (err: unknown) {
      showToast(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleReset = () => {
    if (!confirm("Reset all topics to defaults? This cannot be undone.")) return;
    const fresh = resetStore();
    setStore(fresh);
    setSelected(null);
    onStoreChange();
    showToast("Reset to defaults.");
  };

  const subs = selectedTopic ? (store.subtopics[selectedTopic] || []) : [];

  return (
    <>
      <style>{`
        .tm-root { display: grid; grid-template-columns: 280px 1fr; min-height: calc(100vh - 48px); background: #060611; font-family: 'DM Sans', sans-serif; color: #e2e0f0; }
        .tm-sidebar { border-right: 1px solid #1a1a2e; padding: 28px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; height: calc(100vh - 48px); scrollbar-width: thin; scrollbar-color: #1e1e38 transparent; }
        .tm-main { padding: 36px 40px; overflow-y: auto; height: calc(100vh - 48px); scrollbar-width: thin; scrollbar-color: #1e1e38 transparent; }
        .tm-section-title { font-family: 'Courier New', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 2.5px; color: #444; margin-bottom: 10px; }
        .tm-topic-item { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid #1a1a2e; border-radius: 6px; cursor: pointer; transition: border-color 0.15s, background 0.15s; margin-bottom: 6px; }
        .tm-topic-item:hover { border-color: #2e2e52; }
        .tm-topic-item.active { border-color: #4f8ef755; background: rgba(79,142,247,0.06); }
        .tm-topic-label { flex: 1; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tm-remove-btn { background: none; border: none; color: #2e2e52; cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: 3px; transition: color 0.15s; flex-shrink: 0; }
        .tm-remove-btn:hover { color: #fca5a5; }
        .tm-input { background: #0a0a1e; border: 1px solid #1a1a2e; color: #e2e0f0; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 9px 12px; border-radius: 6px; outline: none; width: 100%; transition: border-color 0.2s; box-sizing: border-box; }
        .tm-input:focus { border-color: #4f8ef755; }
        .tm-input::placeholder { color: #2e2e52; }
        .tm-select { background: #0a0a1e; border: 1px solid #1a1a2e; color: #e2e0f0; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 9px 12px; border-radius: 6px; outline: none; cursor: pointer; }
        .tm-add-btn { background: #4f8ef7; color: #fff; border: none; border-radius: 6px; padding: 9px 16px; font-family: 'Courier New', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; transition: opacity 0.2s; white-space: nowrap; }
        .tm-add-btn:hover { opacity: 0.85; }
        .tm-add-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .tm-sub-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; background: rgba(255,255,255,0.04); border: 1px solid #1a1a2e; border-radius: 20px; font-size: 13px; margin: 4px; }
        .tm-sub-remove { background: none; border: none; color: #2e2e52; cursor: pointer; font-size: 13px; padding: 0; transition: color 0.15s; line-height: 1; }
        .tm-sub-remove:hover { color: #fca5a5; }
        .tm-action-btn { font-family: 'Courier New', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; background: none; border: 1px solid #1a1a2e; color: #2e2e52; padding: 8px 14px; border-radius: 6px; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
        .tm-action-btn:hover { border-color: #4f8ef7; color: #4f8ef7; }
        .tm-action-btn.danger:hover { border-color: #fca5a5; color: #fca5a5; }
        .tm-action-btn.success:hover { border-color: #34d399; color: #34d399; }
        .tm-divider { height: 1px; background: #1a1a2e; margin: 6px 0; }
        .tm-toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: rgba(10,10,26,0.95); border: 1px solid #4f8ef755; color: #e2e0f0; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-family: 'Courier New', monospace; letter-spacing: 1px; backdrop-filter: blur(8px); z-index: 200; pointer-events: none; animation: tmFadeIn 0.2s ease; }
        @keyframes tmFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .tm-empty { color: #2e2e52; font-size: 13px; font-style: italic; padding: 8px 0; }
        .tm-badge { font-family: 'Courier New', monospace; font-size: 8px; background: rgba(79,142,247,0.12); color: #4f8ef7; padding: 2px 7px; border-radius: 10px; }
      `}</style>

      <div className="tm-root">
        {/* ── LEFT: topic list ── */}
        <aside className="tm-sidebar">
          <div className="tm-section-title">Topics ({store.topics.length})</div>

          <div>
            {store.topics.map(t => (
              <div
                key={t.label}
                className={`tm-topic-item${selectedTopic === t.label ? " active" : ""}`}
                onClick={() => setSelected(t.label)}
              >
                <span>{t.emoji}</span>
                <span className="tm-topic-label" style={{ color: t.color }}>{t.label}</span>
                <span className="tm-badge">{(store.subtopics[t.label] || []).length}</span>
                <button className="tm-remove-btn" onClick={e => { e.stopPropagation(); removeTopic(t.label); }} title="Remove topic">✕</button>
              </div>
            ))}
          </div>

          <div className="tm-divider" />

          <div className="tm-section-title">Add Topic</div>
          <div style={{ display: "flex", gap: 6 }}>
            <select className="tm-select" value={newTopicEmoji} onChange={e => setNewTopicEmoji(e.target.value)}>
              {EMOJI_OPTIONS.map(em => <option key={em} value={em}>{em}</option>)}
            </select>
            <input className="tm-input" value={newTopicLabel} onChange={e => setNewTopicLabel(e.target.value)} placeholder="Topic name" onKeyDown={e => e.key === "Enter" && addTopic()} />
          </div>
          <button className="tm-add-btn" onClick={addTopic} disabled={!newTopicLabel.trim()}>+ Add Topic</button>

          <div className="tm-divider" />

          <div className="tm-section-title">Excel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="tm-action-btn success" onClick={handleExport}>⬇ Export to Excel</button>
            <button className="tm-action-btn" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? "Importing…" : "⬆ Import from Excel"}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImport} />
          </div>

          <div className="tm-divider" />
          <button className="tm-action-btn danger" onClick={handleReset}>↺ Reset to Defaults</button>
        </aside>

        {/* ── RIGHT: subtopics for selected topic ── */}
        <main className="tm-main">
          {!selectedTopic ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 14 }}>
              <div style={{ fontSize: 40, opacity: 0.15 }}>◈</div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#2e2e52" }}>Select a topic to manage its subtopics</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <div style={{ fontSize: 28 }}>{store.topics.find(t => t.label === selectedTopic)?.emoji}</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: store.topics.find(t => t.label === selectedTopic)?.color }}>{selectedTopic}</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#444", letterSpacing: 2, textTransform: "uppercase" }}>{subs.length} subtopic{subs.length !== 1 ? "s" : ""}</div>
                </div>
              </div>

              {/* Subtopic chips */}
              <div style={{ marginBottom: 28 }}>
                <div className="tm-section-title" style={{ marginBottom: 12 }}>Subtopics</div>
                {subs.length === 0 ? (
                  <div className="tm-empty">No subtopics yet. Add one below.</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                    {subs.map((s: Subtopic) => (
                      <div key={s.label} className="tm-sub-chip">
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                        <button className="tm-sub-remove" onClick={() => removeSubtopic(selectedTopic, s.label)} title="Remove">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add subtopic */}
              <div style={{ background: "rgba(10,10,26,0.6)", border: "1px solid #1a1a2e", borderRadius: 10, padding: "20px 24px" }}>
                <div className="tm-section-title" style={{ marginBottom: 14 }}>Add Subtopic to "{selectedTopic}"</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select className="tm-select" value={newSubIcon} onChange={e => setNewSubIcon(e.target.value)}>
                    {EMOJI_OPTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                  <input
                    className="tm-input"
                    value={newSubLabel}
                    onChange={e => setNewSubLabel(e.target.value)}
                    placeholder="Subtopic name"
                    onKeyDown={e => e.key === "Enter" && addSubtopic()}
                    style={{ flex: 1 }}
                  />
                  <button className="tm-add-btn" onClick={addSubtopic} disabled={!newSubLabel.trim()}>
                    + Add
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {toast && <div className="tm-toast">{toast}</div>}
    </>
  );
}
