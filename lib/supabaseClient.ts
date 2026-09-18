'use client';
import { createClient } from '@supabase/supabase-js';

// browser-side client — anon key only, safe to ship. All writes go through
// SECURITY DEFINER RPCs (see supabase/migrations/0001_init.sql), reads are
// limited by RLS to sectors/game_state/buzz_winner.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// shared secret the host UI passes into host_* RPCs; only meaningful together
// with the /host route, never treat as real auth.
export const HOST_KEY = process.env.NEXT_PUBLIC_HOST_KEY!;
