let csrfToken = '';
export function setCsrfToken(value: string) {
  csrfToken = value;
}
export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase())) {
    headers.set('Content-Type', 'application/json');
    headers.set('X-Postcraft-CSRF', csrfToken);
  }
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
  if (response.status === 401)
    window.dispatchEvent(new Event('postcraft:unauthorized'));
  return response;
}
export async function restoreSession() {
  const response = await fetch('/api/auth/session', {
    credentials: 'same-origin',
  });
  if (!response.ok) {
    csrfToken = '';
    return false;
  }
  const session = await response.json();
  csrfToken = session.csrfToken;
  return true;
}
