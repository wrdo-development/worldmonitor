/**
 * GET /api/wrdo/v1/email
 *
 * Proxies to Heart API for the owner's Gmail inbox listing.
 * Auth: x-node-secret (CAVE_NODE_SECRET) + x-wrdo-product: cave
 *       x-wrdo-user-id: WRDO_OWNER_USER_ID (defaults to Alwyn's UUID)
 *
 * Heart endpoint: GET /api/v1/gmail/list
 */

import type { RouteDescriptor } from '../../../router';

const TIMEOUT_MS = 10_000;
const DEFAULT_OWNER_USER_ID = '588e3a78-50ee-4944-a2b6-5ff5fb2e45bb';

export function createEmailRoute(): RouteDescriptor {
  return {
    method: 'GET',
    path: '/api/wrdo/v1/email',
    async handler(_req: Request): Promise<Response> {
      const heartUrl = process.env.HEART_API_URL;
      const nodeSecret = process.env.CAVE_NODE_SECRET;

      if (!heartUrl || !nodeSecret) {
        return new Response(
          JSON.stringify({ error: 'HEART_API_URL or CAVE_NODE_SECRET not configured' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const userId = process.env.WRDO_OWNER_USER_ID || DEFAULT_OWNER_USER_ID;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const upstream = await fetch(`${heartUrl}/api/v1/gmail/list`, {
          signal: controller.signal,
          headers: {
            'x-node-secret': nodeSecret,
            'x-wrdo-product': 'cave',
            'x-wrdo-user-id': userId,
            'Accept': 'application/json',
          },
        });
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
          JSON.stringify({ error: isTimeout ? 'Heart API timeout' : 'Failed to reach Heart API' }),
          { status: isTimeout ? 504 : 502, headers: { 'Content-Type': 'application/json' } },
        );
      }
    },
  };
}
