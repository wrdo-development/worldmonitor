/**
 * POST /api/wrdo/v1/chat
 *
 * Server-side proxy for Heart API streaming chat. Pipes the SSE stream
 * from Heart directly to the browser so the node secret never reaches
 * client-side code.
 *
 * Request body: { message: string, platform?: string }
 * Response: SSE stream from Heart /api/v1/brain/me/stream
 */

import type { RouteDescriptor } from '../../../router';

const TIMEOUT_MS = 30_000;

export function createChatRoute(): RouteDescriptor {
  return {
    method: 'POST',
    path: '/api/wrdo/v1/chat',
    async handler(req: Request): Promise<Response> {
      const heartUrl = process.env.HEART_API_URL;
      const nodeSecret = process.env.CAVE_NODE_SECRET;

      if (!heartUrl || !nodeSecret) {
        return new Response(
          JSON.stringify({ error: 'HEART_API_URL or CAVE_NODE_SECRET not configured' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
      }

      let body: string;
      try {
        body = await req.text();
        // Validate it's parseable JSON with a message field
        const parsed = JSON.parse(body);
        if (!parsed.message || typeof parsed.message !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Missing or invalid "message" field' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }
        // Ensure platform is set
        if (!parsed.platform) {
          parsed.platform = 'cave';
          body = JSON.stringify(parsed);
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const upstream = await fetch(`${heartUrl}/api/v1/brain/me/stream`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'x-node-secret': nodeSecret,
            'x-wrdo-product': 'cave',
            'x-wrdo-channel': 'cave-app',
          },
          body,
        });
        clearTimeout(timer);

        if (!upstream.ok) {
          const errText = await upstream.text();
          return new Response(
            JSON.stringify({ error: `Heart API error: ${upstream.status}`, detail: errText }),
            { status: upstream.status, headers: { 'Content-Type': 'application/json' } },
          );
        }

        // Pipe the SSE stream directly to the browser
        const responseHeaders = new Headers({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
        });

        return new Response(upstream.body, {
          status: 200,
          headers: responseHeaders,
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
