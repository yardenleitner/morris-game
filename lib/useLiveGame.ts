'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { GameState, Sector, SECTOR_IDS } from './types';

// single shared realtime hook for /host, /screen, /play — subscribes to the two
// tables that drive the whole game and refetches on any change. 6 rows total,
// refetch-on-change is simpler and safer than patching partial payloads.
export function useLiveGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const [g, s] = await Promise.all([
      supabase.from('game_state').select('*').eq('id', 1).single(),
      supabase.from('sectors').select('*').order('id'),
    ]);
    if (g.data) setGame(g.data as GameState);
    if (s.data) {
      const bySector = new Map(s.data.map((r: any) => [r.id, r]));
      setSectors(SECTOR_IDS.map((id) => bySector.get(id)).filter(Boolean) as Sector[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel('morris-game-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors' }, refetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { game, sectors, loading, refetch };
}
