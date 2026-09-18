import { createClient } from '@supabase/supabase-js';

// server-only client — service role key, bypasses RLS. NEVER import this from
// a 'use client' component. Used only inside server actions / route handlers,
// for the content-editor screen (reads/writes trivia_questions, truefalse_stories,
// speech_words — tables anon has no access to because they contain answers).
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
