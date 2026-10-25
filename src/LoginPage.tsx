import './styles/LoginPage.css';
import { setCsrfToken } from './api';
import { useState } from 'react';

interface Props {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.ok) {
        setCsrfToken(data.csrfToken);
        onLogin();
      } else {
        setError(data.error || 'Invalid username or password.');
      }
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
          <div className="login-subtitle">
            Enter your credentials to continue
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="pc-username">
                Username
              </label>
              <input
                id="pc-username"
                className="login-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="pc-password">
                Password
              </label>
              <input
                id="pc-password"
                className="login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Verifying…' : 'Sign In'}
            </button>

            {error && <div className="login-error">{error}</div>}
          </form>
        </div>
      </div>
    </>
  );
}
