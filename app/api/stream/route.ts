import { publicState, subscribe } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

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
