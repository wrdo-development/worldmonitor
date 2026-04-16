/**
 * WRDO Cave — Production server for Railway.
 * Serves the Vite build (dist/) and handles WRDO API proxy routes.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '3000', 10);

const HEART_API_URL = process.env.HEART_API_URL || 'https://api.wrdo.co.za';
const CAVE_NODE_SECRET = process.env.CAVE_NODE_SECRET || '';
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN || '';
const WRDO_OWNER_USER_ID = process.env.WRDO_OWNER_USER_ID || '588e3a78-50ee-4944-a2b6-5ff5fb2e45bb';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
};

// ── WRDO API proxy routes ───────────────────────────────────────────────

async function proxyToHeart(path, req, res) {
  const url = `${HEART_API_URL}${path}`;
  const headers = {
    'x-node-secret': CAVE_NODE_SECRET,
    'x-wrdo-product': 'cave',
    'x-wrdo-user-id': WRDO_OWNER_USER_ID,
    'Content-Type': 'application/json',
  };

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? await readBody(req) : undefined,
      signal: AbortSignal.timeout(15000),
    });

    // SSE passthrough
    if (upstream.headers.get('content-type')?.includes('text/event-stream')) {
      res.writeHead(upstream.status, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      const reader = upstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); return; }
          res.write(value);
        }
      };
      pump().catch(() => res.end());
      return;
    }

    const body = await upstream.text();
    res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json' });
    res.end(body);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Upstream failed', message: err.message }));
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

const API_ROUTES = {
  '/api/wrdo/v1/agents': '/api/v1/agents',
  '/api/wrdo/v1/queues': '/api/v1/admin/queue-health',
  '/api/wrdo/v1/costs': '/api/v1/dashboard/metrics',
  '/api/wrdo/v1/health': null, // special
  '/api/wrdo/v1/calendar': '/api/v1/google/calendar/events',
  '/api/wrdo/v1/email': '/api/v1/gmail/list',
};

async function handleHealth(_req, res) {
  const checks = await Promise.allSettled([
    fetch(`${HEART_API_URL}/health`, { signal: AbortSignal.timeout(5000) }),
  ]);
  const results = checks.map((r, i) => ({
    service: ['heart'][i],
    ok: r.status === 'fulfilled' && r.value.ok,
  }));
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ services: results }));
}

async function handleSentry(_req, res) {
  try {
    const upstream = await fetch('https://sentry.io/api/0/organizations/wrdo/issues/?query=is:unresolved&limit=10', {
      headers: { 'Authorization': `Bearer ${SENTRY_AUTH_TOKEN}` },
      signal: AbortSignal.timeout(10000),
    });
    const body = await upstream.text();
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    res.end(body);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ── Static file server ──────────────────────────────────────────────────

async function serveStatic(pathname, res) {
  let filePath = join(DIST_DIR, pathname);

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    // SPA fallback
    filePath = join(DIST_DIR, 'index.html');
  }

  try {
    const content = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    // SPA fallback for any 404
    const index = await readFile(join(DIST_DIR, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(index);
  }
}

// ── HTTP server ─────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // WRDO API routes
  if (pathname === '/api/wrdo/v1/chat') {
    const headers = {
      'x-node-secret': CAVE_NODE_SECRET,
      'x-wrdo-product': 'cave',
      'x-wrdo-channel': 'cave-app',
      'x-wrdo-user-id': WRDO_OWNER_USER_ID,
      'Content-Type': 'application/json',
    };
    const body = await readBody(req);
    const parsed = JSON.parse(body);
    const upstream = await fetch(`${HEART_API_URL}/api/v1/brain/me/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: parsed.message, platform: 'cave' }),
    });
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        res.write(value);
      }
    };
    pump().catch(() => res.end());
    return;
  }

  if (pathname === '/api/wrdo/v1/health') { await handleHealth(req, res); return; }
  if (pathname === '/api/wrdo/v1/sentry') { await handleSentry(req, res); return; }

  const heartPath = API_ROUTES[pathname];
  if (heartPath) { await proxyToHeart(heartPath, req, res); return; }

  // Static files
  await serveStatic(pathname, res);
});

server.listen(PORT, () => {
  console.log(`WRDO Cave running on port ${PORT}`);
});
