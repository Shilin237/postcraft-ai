import { useState } from "react";

interface Props {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem("pc_auth", "1");
        onLogin();
      } else {
        setError(data.error || "Invalid username or password.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-root {
          min-height: 100vh;
          background: #060611;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', 'Plus Jakarta Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .login-orb-1 {
          position: fixed; width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%);
          border-radius: 50%; top: -100px; left: -150px;
          animation: loginFloat 14s ease-in-out infinite; pointer-events: none;
        }
        .login-orb-2 {
          position: fixed; width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%);
          border-radius: 50%; bottom: -80px; right: -100px;
          animation: loginFloat 18s ease-in-out infinite reverse; pointer-events: none;
        }
        @keyframes loginFloat {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-24px); }
        }
        .login-grid {
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(79,142,247,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,142,247,0.015) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }
        .login-card {
          background: rgba(10,10,26,0.7);
          border: 1px solid #1a1a2e;
          border-radius: 16px;
          padding: 48px 44px;
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(12px);
          position: relative;
          z-index: 1;
        }
        .login-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 36px;
        }
        .login-brand-dot {
          width: 8px; height: 8px;
          background: #4f8ef7;
          border-radius: 50%;
          box-shadow: 0 0 10px #4f8ef755;
          animation: loginPulse 2s ease-in-out infinite;
        }
        @keyframes loginPulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .login-brand-name {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #e2e0f0;
        }
        .login-title {
          font-family: 'Courier New', monospace;
          font-size: 22px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #e2e0f0;
          margin-bottom: 6px;
        }
        .login-subtitle {
          font-size: 13px;
          color: #2e2e52;
          margin-bottom: 32px;
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
        }
        .login-label {
          font-family: 'Courier New', monospace;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 2.5px;
          color: #444;
          margin-bottom: 7px;
          display: block;
        }
        .login-input {
          width: 100%;
          background: #060611;
          border: 1px solid #1a1a2e;
          color: #e2e0f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          padding: 13px 16px;
          border-radius: 8px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: #4f8ef755;
          box-shadow: 0 0 0 3px rgba(79,142,247,0.08);
        }
        .login-input::placeholder { color: #2e2e52; }
        .login-field { margin-bottom: 20px; }
        .login-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #4f8ef7, #6c63ff);
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2.5px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          margin-top: 8px;
        }
        .login-btn:hover:not(:disabled) { opacity: 0.88; }
        .login-btn:active:not(:disabled) { transform: scale(0.98); }
        .login-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .login-error {
          background: rgba(252,165,165,0.06);
          border: 1px solid rgba(252,165,165,0.2);
          border-radius: 8px;
          padding: 11px 14px;
          font-size: 13px;
          color: #fca5a5;
          margin-top: 14px;
          text-align: center;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div className="login-root">
        <div className="login-orb-1" />
        <div className="login-orb-2" />
        <div className="login-grid" />

        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-dot" />
            <span className="login-brand-name">PostCraft AI</span>
          </div>

          <div className="login-title">Sign In</div>
          <div className="login-subtitle">Enter your credentials to continue</div>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="pc-username">Username</label>
              <input
                id="pc-username"
                className="login-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="pc-password">Password</label>
              <input
                id="pc-password"
                className="login-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Verifying…" : "Sign In"}
            </button>

            {error && <div className="login-error">{error}</div>}
          </form>
        </div>
      </div>
    </>
  );
}
