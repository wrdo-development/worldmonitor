/**
 * GET /api/wrdo/v1/health
 *
 * Probes multiple WRDO service health endpoints concurrently and aggregates results.
 * Returns a summary of which services are up/down.
 */

import type { RouteDescriptor } from '../../../router';

const TIMEOUT_MS = 8_000;

interface ServiceResult {
  name: string;
  url: string;
  status: 'up' | 'down' | 'unconfigured';
  httpStatus?: number;
  error?: string;
}

async function probeService(name: string, url: string | undefined): Promise<ServiceResult> {
  if (!url) {
    return { name, url: '', status: 'unconfigured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${url}/health`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    return {
      name,
      url,
      status: res.ok ? 'up' : 'down',
      httpStatus: res.status,
    };
  } catch (err: any) {
    clearTimeout(timer);
    return {
      name,
      url,
      status: 'down',
      error: err?.name === 'AbortError' ? 'timeout' : (err?.message ?? 'unreachable'),
    };
  }
}

export function createHealthRoute(): RouteDescriptor {
  return {
    method: 'GET',
    path: '/api/wrdo/v1/health',
    async handler(_req: Request): Promise<Response> {
      const heartUrl = process.env.HEART_API_URL;
      const caveUrl = process.env.CAVE_API_URL;

      const results = await Promise.all([
        probeService('heart', heartUrl),
        probeService('cave', caveUrl),
      ]);

      const allUp = results.every((r) => r.status === 'up');
      const anyDown = results.some((r) => r.status === 'down');

      const payload = {
        status: allUp ? 'healthy' : anyDown ? 'degraded' : 'partial',
        services: results,
        checkedAt: new Date().toISOString(),
      };

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}
