/**
 * Vite dev server plugin — WRDO platform API routes.
 *
 * Intercepts requests matching /api/wrdo/v1/* and proxies them to the
 * appropriate WRDO platform services (Heart API, Sentry).
 *
 * In production these routes are served via Vercel edge functions;
 * this plugin provides equivalent behaviour for local development.
 *
 * Required env vars (set in .env or via Infisical):
 *   HEART_API_URL       — e.g. https://api.wrdo.co.za
 *   CAVE_NODE_SECRET    — node secret for Heart auth
 *   SENTRY_AUTH_TOKEN   — Sentry API token
 *   CAVE_API_URL        — Cave API base URL (for health check)
 */

import type { Plugin } from 'vite';
import { createRouter } from '../../../router';
import { createAgentsRoute } from './agents';
import { createSentryRoute } from './sentry';
import { createQueuesRoute } from './queues';
import { createHealthRoute } from './health';
import { createCostsRoute } from './costs';

const WRDO_PATH_RE = /^\/api\/wrdo\/v1\//;

export function wrdoApiPlugin(): Plugin {
  const routes = [
    createAgentsRoute(),
    createSentryRoute(),
    createQueuesRoute(),
    createHealthRoute(),
    createCostsRoute(),
  ];

  const router = createRouter(routes);

  return {
    name: 'wrdo-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !WRDO_PATH_RE.test(req.url)) {
          return next();
        }

        try {
          const port = server.config.server.port || 3000;
          const url = new URL(req.url, `http://localhost:${port}`);

          // Collect headers
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') {
              headers[key] = value;
            } else if (Array.isArray(value)) {
              headers[key] = value.join(', ');
            }
          }

          // Read body for non-GET methods (unlikely for these read-only routes, but correct)
          let body: string | undefined;
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk as Buffer);
            }
            body = Buffer.concat(chunks).toString();
          }

          const webRequest = new Request(url.toString(), {
            method: req.method,
            headers,
            body: body || undefined,
          });

          // OPTIONS preflight
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.end();
            return;
          }

          const matchedHandler = router.match(webRequest);
          if (!matchedHandler) {
            const allowed = router.allowedMethods(url.pathname);
            if (allowed.length > 0) {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Allow', allowed.join(', '));
              res.end(JSON.stringify({ error: 'Method not allowed' }));
            } else {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Not found' }));
            }
            return;
          }

          const response = await matchedHandler(webRequest);

          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(await response.text());
        } catch (err) {
          console.error('[wrdo-api] Error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}
