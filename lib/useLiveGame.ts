'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState, PublicState, Sector, SECTOR_IDS } from './types';

const STALE_AFTER_MS = 25_000; // server pings every 10s, so silence this long means the link is gone

// A tab opened before a rebuild keeps running the JavaScript it was served while
// SSE happily feeds it fresh state, so it looks completely alive and simply lacks
// whatever changed — which reads as "the fix didn't work" rather than as a stale
// page. Rebuilding for a live show and leaving the projector tab open does exactly
// this, so the page detects it and reloads itself.
//
// The comparison is against the build this tab FIRST connected to, not a value
// baked into the bundle: whatever the server reported when the page loaded is by
// definition the build that served this JavaScript. If it ever reports a different
// one, a rebuild happened underneath us and the code in memory is out of date.
let connectedBuild: string | null = null;

// Reload at most once per observed build, so a mismatch can never become a loop.
const RELOADED_FOR = 'morris-reloaded-for-build';

function reloadIfStale(serverBuild: string) {
  if (!serverBuild) return;                       // dev server: check disabled
  if (connectedBuild === null) {                  // first connect: this is our build
    connectedBuild = serverBuild;
    return;
  }
  if (serverBuild === connectedBuild) return;
  try {
    if (sessionStorage.getItem(RELOADED_FOR) === serverBuild) return; // already tried
    sessionStorage.setItem(RELOADED_FOR, serverBuild);
  } catch {
    return; // no sessionStorage: refuse to reload rather than risk a loop
  }
  location.reload();
}

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
      source.addEventListener('build', (e) => {
        try {
          reloadIfStale((JSON.parse((e as MessageEvent).data) as { build: string }).build);
        } catch {
          /* malformed frame: nothing worth reloading over */
        }
      });
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
