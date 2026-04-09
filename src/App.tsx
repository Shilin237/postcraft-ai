import { useState } from "react";
import LoginPage from "./LoginPage";
import LinkedInGenerator from "./LinkedInGenerator";
import CarouselGenerator from "./CarouselGenerator";
import TopicManager from "./TopicManager";

type Tool = "linkedin" | "carousel" | "manage";

function isAuthenticated() {
  return sessionStorage.getItem("pc_auth") === "1";
}

export default function App() {
  const [authed, setAuthed]           = useState(isAuthenticated);
  const [tool, setTool]               = useState<Tool>("linkedin");
  const [storeVersion, setStoreVersion] = useState(0);

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return (
    <>
      <style>{`
        .app-nav { display: flex; align-items: center; gap: 0; background: rgba(6,6,17,0.95); border-bottom: 1px solid #1a1a2e; height: 48px; padding: 0 24px; position: sticky; top: 0; z-index: 50; backdrop-filter: blur(8px); }
        .app-nav-brand { font-family: 'Courier New', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #2e2e52; margin-right: 28px; }
        .app-nav-tab { font-family: 'Courier New', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; background: none; border: none; border-bottom: 2px solid transparent; padding: 0 16px; height: 48px; cursor: pointer; color: #2e2e52; transition: color 0.2s, border-color 0.2s; }
        .app-nav-tab:hover { color: #e2e0f0; }
        .app-nav-tab.active-linkedin { color: #4f8ef7; border-bottom-color: #4f8ef7; }
        .app-nav-tab.active-carousel { color: #FF4D00; border-bottom-color: #FF4D00; }
        .app-nav-tab.active-manage   { color: #a78bfa; border-bottom-color: #a78bfa; }
        .app-nav-spacer { flex: 1; }
        .app-nav-logout { font-family: 'Courier New', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; background: none; border: 1px solid #1a1a2e; color: #2e2e52; padding: 6px 14px; border-radius: 4px; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
        .app-nav-logout:hover { border-color: #fca5a5; color: #fca5a5; }
      `}</style>

      <nav className="app-nav">
        <span className="app-nav-brand">PostCraft</span>
        <button className={`app-nav-tab${tool === "linkedin"  ? " active-linkedin"  : ""}`} onClick={() => setTool("linkedin")}>LinkedIn Post</button>
        <button className={`app-nav-tab${tool === "carousel"  ? " active-carousel"  : ""}`} onClick={() => setTool("carousel")}>Carousel Maker</button>
        <button className={`app-nav-tab${tool === "manage"    ? " active-manage"    : ""}`} onClick={() => setTool("manage")}>⚙ Manage Topics</button>
        <div className="app-nav-spacer" />
        <button className="app-nav-logout" onClick={() => { sessionStorage.removeItem("pc_auth"); setAuthed(false); }}>Sign Out</button>
      </nav>

      {tool === "linkedin"  && <LinkedInGenerator storeVersion={storeVersion} />}
      {tool === "carousel"  && <CarouselGenerator />}
      {tool === "manage"    && <TopicManager onStoreChange={() => setStoreVersion(v => v + 1)} />}
    </>
  );
}
