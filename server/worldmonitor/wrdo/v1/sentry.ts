/**
 * GET /api/wrdo/v1/sentry
 *
 * Proxies to Sentry API for active (unresolved) issues in the wrdo organisation.
 * Auth: Bearer SENTRY_AUTH_TOKEN
 */

import type { RouteDescriptor } from '../../../router';

const TIMEOUT_MS = 12_000;
const SENTRY_BASE = 'https://sentry.io/api/0';

export function createSentryRoute(): RouteDescriptor {
  return {
    method: 'GET',
    path: '/api/wrdo/v1/sentry',
    async handler(_req: Request): Promise<Response> {
      const token = process.env.SENTRY_AUTH_TOKEN;

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'SENTRY_AUTH_TOKEN not configured' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const upstream = await fetch(
          `${SENTRY_BASE}/organizations/wrdo/issues/?query=is:unresolved`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
        );
        clearTimeout(timer);

        const body = await upstream.text();
        return new Response(body, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        clearTimeout(timer);
        const isTimeout = err?.name === 'AbortError';
        return new Response(
          JSON.stringify({ error: isTimeout ? 'Sentry API timeout' : 'Failed to reach Sentry API' }),
          { status: isTimeout ? 504 : 502, headers: { 'Content-Type': 'application/json' } },
        );
      }
    },
  };
}
