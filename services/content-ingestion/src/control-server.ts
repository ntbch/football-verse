import crypto from 'node:crypto';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';

export interface ControlState {
  running: boolean;
  lastStartedAt?: string;
  lastFinishedAt?: string;
  lastError?: string;
}

function tokenMatches(expected: string, candidate: string | undefined): boolean {
  if (!candidate) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(candidate);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export function startControlServer(
  internalToken: string,
  trigger: () => boolean,
  state: () => ControlState,
  readiness: () => Promise<unknown>,
): void {
  const port = Number.parseInt(process.env.PORT || '8085', 10);
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { status: 'UP', service: 'content-ingestion', ...state() });
    }

    if (req.method === 'POST' && req.url === '/crawl') {
      const token = typeof req.headers['x-internal-token'] === 'string'
        ? req.headers['x-internal-token']
        : undefined;
      if (!tokenMatches(internalToken, token)) {
        return json(res, 401, { success: false, message: 'Unauthorized' });
      }
      if (!trigger()) {
        return json(res, 409, { success: false, message: 'Synchronization already running' });
      }
      return json(res, 202, { success: true, message: 'Synchronization accepted' });
    }

    if (req.method === 'GET' && req.url === '/readiness') {
      const token = typeof req.headers['x-internal-token'] === 'string'
        ? req.headers['x-internal-token']
        : undefined;
      if (!tokenMatches(internalToken, token)) {
        return json(res, 401, { success: false, message: 'Unauthorized' });
      }
      try {
        return json(res, 200, { sources: await readiness() });
      } catch {
        return json(res, 503, { success: false, message: 'Readiness unavailable' });
      }
    }

    return json(res, 404, { success: false, message: 'Not found' });
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Control] Content Ingestion listening on port ${port}`);
  });
}
