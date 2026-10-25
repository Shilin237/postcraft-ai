import './styles/CarouselGenerator.css';
import { apiFetch } from './api';
import { useState, useEffect, useCallback, useRef } from 'react';

const TONES = [
  'Motivational',
  'Educational',
  'Contrarian',
  'Storytelling',
  'Punchy & Direct',
  'Empathetic',
];

const THEMES = [
  {
    id: 'dark',
    label: 'Dark',
    bg: 'linear-gradient(135deg,#090909 50%,#FF4D00 50%)',
  },
  {
    id: 'light',
    label: 'Light',
    bg: 'linear-gradient(135deg,#F0F0F0 50%,#FF4D00 50%)',
  },
  {
    id: 'blue',
    label: 'Blue',
    bg: 'linear-gradient(135deg,#0A0E1A 50%,#2563EB 50%)',
  },
  {
    id: 'purple',
    label: 'Purple',
    bg: 'linear-gradient(135deg,#0D0D1A 50%,#9B59FF 50%)',
  },
];

const EXAMPLES = [
  'Morning routines',
  'AI and creativity',
  'Why most diets fail',
  'Building habits',
  'Stoicism for founders',
];

interface HistoryItem {
  run_id: string;
  topic: string;
  theme: string;
  html_content: string;
  linkedin_summary: string;
  time: string;
}

const HISTORY_KEY = 'carousel_history_v2';

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 8)));
}

export default function CarouselGenerator() {
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('');
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'linkedin'>('preview');
  const [htmlContent, setHtmlContent] = useState('');
  const [liPost, setLiPost] = useState('');
  const [runId, setRunId] = useState('');
  const [slideLabel, setSlideLabel] = useState('1 / 10');
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [copied, setCopied] = useState(false);

  const handleMessage = useCallback((e: MessageEvent) => {
    if (
      e.source === previewRef.current?.contentWindow &&
      e.data?.type === 'slide-change' &&
      Number.isInteger(e.data.current) &&
      e.data.current >= 1 &&
      e.data.current <= 10 &&
      e.data.total === 10
    ) {
      setSlideLabel(`${e.data.current} / ${e.data.total}`);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError('');
    setHtmlContent('');
    setLiPost('');

    try {
      const res = await apiFetch('/api/carousel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), audience, tone, theme }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setHtmlContent(data.html_content || '');
      setLiPost(data.linkedin_summary || '');
      setRunId(data.run_id);
      setSlideLabel('1 / 10');
      setActiveTab('preview');

      const newItem: HistoryItem = {
        run_id: data.run_id,
        topic: topic.trim(),
        theme: data.theme,
        html_content: data.html_content || '',
        linkedin_summary: data.linkedin_summary || '',
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      const updated = [newItem, ...history];
      setHistory(updated);
      saveHistory(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
    setHtmlContent(item.html_content || '');
    setLiPost(item.linkedin_summary);
    setRunId(item.run_id);
    setSlideLabel('1 / 10');
    setActiveTab('preview');
    setError('');
  };

  return (
    <>
      <div className="car-root">
        {/* ── SIDEBAR ── */}
        <aside className="car-sidebar">
          <div
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 18,
              letterSpacing: 2,
              color: '#e2e0f0',
              textTransform: 'uppercase',
            }}
          >
            Carousel<span style={{ color: '#FF4D00' }}>.</span>
          </div>

          <form
            onSubmit={handleGenerate}
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            <div>
              <div className="car-label">Topic *</div>
              <input
                className="car-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Morning routines for founders"
                required
              />
            </div>

            <div>
              <div className="car-label">
                Target Audience{' '}
                <span style={{ color: '#2e2e52' }}>(optional)</span>
              </div>
              <input
                className="car-input"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Startup founders, age 25–40"
              />
            </div>

            <div>
              <div className="car-label">
                Tone <span style={{ color: '#2e2e52' }}>(optional)</span>
              </div>
              <select
                className="car-select"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="">— Choose tone —</option>
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="car-label">Theme</div>
              <div className="car-swatches">
                {THEMES.map((th) => (
                  <div
                    key={th.id}
                    className={`car-swatch${theme === th.id ? ' active' : ''}${th.id === 'light' ? ' light-swatch' : ''}`}
                    style={{ background: th.bg }}
                    onClick={() => setTheme(th.id)}
                  >
                    {th.label}
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="car-btn" disabled={loading}>
              {loading ? 'Generating…' : 'Generate Carousel'}
            </button>
          </form>

          {error && <div className="car-error">{error}</div>}

          {htmlContent && (
            <>
              <div className="car-divider" />
              <div>
                <div className="car-label" style={{ marginBottom: 10 }}>
                  Download
                </div>
                <button
                  className="car-dl-btn"
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    background: 'none',
                  }}
                  onClick={() => {
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `carousel_${runId}.html`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  <span style={{ color: '#FF4D00' }}>⬡</span> Download HTML
                </button>
              </div>
            </>
          )}

          <div className="car-divider" />

          <div>
            <div className="car-label" style={{ marginBottom: 10 }}>
              Recent
            </div>
            {history.length === 0 ? (
              <div
                style={{ fontSize: 12, color: '#2e2e52', fontStyle: 'italic' }}
              >
                No carousels yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((item) => (
                  <div
                    key={item.run_id}
                    className="car-hist-item"
                    onClick={() => loadFromHistory(item)}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        background: '#FF4D00',
                        borderRadius: '50%',
                        flexShrink: 0,
                        opacity: 0.5,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#e2e0f0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.topic}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Courier New', monospace",
                          fontSize: 8,
                          color: '#2e2e52',
                          marginTop: 2,
                        }}
                      >
                        {item.theme} · {item.time}
                      </div>
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
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  color: '#2e2e52',
                  maxWidth: 260,
                  lineHeight: 1.8,
                }}
              >
                Enter a topic and hit Generate.
                <br />
                Your carousel will appear here.
              </div>
              <div className="car-example-chips">
                {EXAMPLES.map((ex) => (
                  <span
                    key={ex}
                    className="car-chip"
                    onClick={() => setTopic(ex)}
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0,
                zIndex: 1,
                width: '100%',
              }}
            >
              {/* Tabs */}
              <div className="car-tabs" style={{ marginBottom: 8 }}>
                <button
                  className={`car-tab${activeTab === 'preview' ? ' active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>
                <button
                  className={`car-tab${activeTab === 'linkedin' ? ' active' : ''}`}
                  onClick={() => setActiveTab('linkedin')}
                >
                  LinkedIn Post
                </button>
              </div>

              {activeTab === 'preview' && (
                <>
                  <div className="car-counter-bar">
                    <span className="car-counter-hint">← → to navigate</span>
                    <span className="car-counter">{slideLabel}</span>
                  </div>
                  <iframe
                    ref={previewRef}
                    className="car-iframe"
                    sandbox="allow-scripts"
                    srcDoc={htmlContent}
                    title="Carousel Preview"
                  />
                </>
              )}

              {activeTab === 'linkedin' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    width: 560,
                    maxWidth: '100%',
                  }}
                >
                  <div className="car-li-box">{liPost}</div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Courier New', monospace",
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        color: '#2e2e52',
                      }}
                    >
                      Ready to paste into LinkedIn
                    </span>
                    <button
                      className={`car-copy-btn${copied ? ' copied' : ''}`}
                      onClick={copyLinkedIn}
                    >
                      {copied ? 'Copied!' : 'Copy Post'}
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
