import './styles/App.css';
import { apiFetch, restoreSession, setCsrfToken } from './api';
import { useState, useEffect, lazy, Suspense } from 'react';
import LoginPage from './LoginPage';
const LinkedInGenerator = lazy(() => import('./LinkedInGenerator'));
const CarouselGenerator = lazy(() => import('./CarouselGenerator'));
const TopicManager = lazy(() => import('./TopicManager'));

type Tool = 'linkedin' | 'carousel' | 'manage';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [tool, setTool] = useState<Tool>('linkedin');
  const [storeVersion, setStoreVersion] = useState(0);

  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  useEffect(() => {
    let active = true;
    const expired = () => {
      setCsrfToken('');
      setAuthed(false);
    };
    window.addEventListener('postcraft:unauthorized', expired);
    restoreSession()
      .then((ok) => {
        if (active) setAuthed(ok);
      })
      .catch(() => {
        if (active)
          setSessionError('Could not reach the server. Reload to try again.');
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      window.removeEventListener('postcraft:unauthorized', expired);
    };
  }, []);
  async function signOut() {
    try {
      const response = await apiFetch('/api/auth/logout', {
        method: 'POST',
        body: '{}',
      });
      if (!response.ok && response.status !== 401) throw new Error();
      setCsrfToken('');
      setAuthed(false);
    } catch {
      setSessionError('Sign out failed. Please try again.');
    }
  }
  if (checking) return <p role="status">Checking your session…</p>;
  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return (
    <>
      <nav className="app-nav">
        <span className="app-nav-brand">PostCraft</span>
        <button
          className={`app-nav-tab${tool === 'linkedin' ? ' active-linkedin' : ''}`}
          onClick={() => setTool('linkedin')}
        >
          LinkedIn Post
        </button>
        <button
          className={`app-nav-tab${tool === 'carousel' ? ' active-carousel' : ''}`}
          onClick={() => setTool('carousel')}
        >
          Carousel Maker
        </button>
        <button
          className={`app-nav-tab${tool === 'manage' ? ' active-manage' : ''}`}
          onClick={() => setTool('manage')}
        >
          ⚙ Manage Topics
        </button>
        <div className="app-nav-spacer" />
        <button className="app-nav-logout" onClick={signOut}>
          Sign Out
        </button>
      </nav>

      {sessionError && <p role="alert">{sessionError}</p>}
      <Suspense fallback={<p role="status">Loading tool…</p>}>
        {tool === 'linkedin' && (
          <LinkedInGenerator storeVersion={storeVersion} />
        )}
        {tool === 'carousel' && <CarouselGenerator />}
        {tool === 'manage' && (
          <TopicManager onStoreChange={() => setStoreVersion((v) => v + 1)} />
        )}
      </Suspense>
    </>
  );
}
