import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import login from '../api/auth/login.js';
import session from '../api/auth/session.js';
import logout from '../api/auth/logout.js';
import linkedinAuth from '../api/auth/linkedin.js';
import callback from '../api/auth/callback.js';
import generate from '../api/generate.js';
import carousel from '../api/carousel.js';
import image from '../api/image.js';
import status from '../api/linkedin/status.js';
import disconnect from '../api/linkedin/disconnect.js';
import post from '../api/linkedin/post.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.all(['/api/auth/login'], login);
  app.all(['/api/auth/session'], session);
  app.all(['/api/auth/logout'], logout);
  app.all(['/api/auth/linkedin', '/auth/linkedin'], linkedinAuth);
  app.all(['/api/auth/callback', '/auth/linkedin/callback'], callback);
  app.all(['/api/generate'], generate);
  app.all(['/api/carousel', '/api/carousel/generate'], carousel);
  app.all(['/api/image', '/api/image/generate'], image);
  app.all(['/api/linkedin/status'], status);
  app.all(['/api/linkedin/disconnect'], disconnect);
  app.all(['/api/linkedin/post'], post);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
  if (process.env.NODE_ENV === 'production') {
    const dist = fileURLToPath(new URL('../dist/', import.meta.url));
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) =>
      res.sendFile(resolve(dist, 'index.html')),
    );
  }
  app.use((err, _req, res, _next) =>
    res
      .status(err.status === 413 ? 413 : 400)
      .json({ error: 'Invalid request body.' }),
  );
  return app;
}
