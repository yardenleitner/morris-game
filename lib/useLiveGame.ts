'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState, PublicState, Sector, SECTOR_IDS } from './types';

const STALE_AFTER_MS = 25_000; // server pings every 10s, so silence this long means the link is gone

// Single shared live-state hook for /host, /screen and /play. Holds one SSE
// connection and replaces the whole snapshot on every push — there are six rows
// of state in total, so patching partial payloads would be fragile for nothing.
export function useLiveGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const lastSeen = useRef(0);

  const apply = useCallback((state: PublicState) => {
    lastSeen.current = Date.now();
    setGame(state.game);
    const bySector = new Map(state.sectors.map((s) => [s.id, s]));
    setSectors(SECTOR_IDS.map((id) => bySector.get(id)).filter(Boolean) as Sector[]);
    setLoading(false);
  }, []);

  const refetch = useCallback(async () => {
    const res = await fetch('/api/state', { cache: 'no-store' });
    apply((await res.json()) as PublicState);
  }, [apply]);

  useEffect(() => {
    let source: EventSource | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      source?.close();
      lastSeen.current = Date.now();
      source = new EventSource('/api/stream');
      source.onopen = () => { lastSeen.current = Date.now(); };
      source.onmessage = (e) => apply(JSON.parse(e.data) as PublicState);
      source.addEventListener('ping', () => { lastSeen.current = Date.now(); });
      // EventSource retries on its own after an error; nothing to do here beyond
      // letting the watchdog below catch the case where it never comes back.
    };

    // A phone that locks its screen or roams between access points can end up
    // holding a connection the server has already forgotten, with no error event
    // to react to. Reconnecting on silence is what stops a rep's buzzer from
    // being quietly dead when the host opens the next round.
    const watchdog = setInterval(() => {
      if (Date.now() - lastSeen.current > STALE_AFTER_MS) connect();
    }, 5_000);

    const wake = () => {
      if (document.visibilityState === 'visible') {
        refetch().catch(() => {});
        if (Date.now() - lastSeen.current > STALE_AFTER_MS) connect();
      }
    };

    // No separate initial fetch: opening the stream pushes a full snapshot as
    // its first frame, so connecting is also how the first paint gets its data.
    connect();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);

    return () => {
      stopped = true;
      clearInterval(watchdog);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      source?.close();
    };
  }, [apply, refetch]);

  return { game, sectors, loading, refetch };
}
