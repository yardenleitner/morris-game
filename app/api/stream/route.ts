import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicState, subscribe } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

// Identity of the build this server is serving. Read from disk rather than from a
// config value, because next.config.ts is re-evaluated on every `next start` and a
// clock-derived id there would mint a fresh value per restart, making every tab look
// stale even when its JavaScript is current. Next rewrites BUILD_ID only on a build,
// which is exactly when a loaded page really has gone out of date. Read once: it
// cannot change under a running server.
const BUILD_ID = (() => {
  try {
    return readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf8').trim();
  } catch {
    return ''; // dev server: no BUILD_ID file, so the staleness check stays off
  }
})();

// Server-sent events: every screen and phone holds one of these open and gets
// pushed the whole game state on each change. Pushing (rather than polling) is
// what keeps the buzzer fair — all five phones learn the buzzer opened at the
// same instant instead of on their own polling schedules.
export function GET(req: Request) {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let open = true;

      const write = (chunk: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          open = false; // client vanished between the abort and this write
        }
      };

      const close = () => {
        if (!open) return;
        open = false;
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // First frame announces which build is serving, so a tab left open across
      // a restart can notice its own JavaScript is stale and reload itself.
      write(`event: build\ndata: ${JSON.stringify({ build: BUILD_ID })}\n\n`);
      write(`data: ${JSON.stringify(publicState())}\n\n`);
      unsubscribe = subscribe((state) => write(`data: ${JSON.stringify(state)}\n\n`));

      // A named event rather than a comment frame: comments never reach
      // EventSource handlers, and the client needs something it can actually
      // observe going quiet to detect a link that died without erroring.
      heartbeat = setInterval(() => write('event: ping\ndata: 1\n\n'), 10_000);

      req.signal.addEventListener('abort', close);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
