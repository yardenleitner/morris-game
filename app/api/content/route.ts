import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const TABLES: Record<string, string> = {
  questions: 'trivia_questions',
  stories: 'truefalse_stories',
  words: 'speech_words',
};

function authed(req: NextRequest) {
  return req.headers.get('x-host-key') === process.env.NEXT_PUBLIC_HOST_KEY;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const table = req.nextUrl.searchParams.get('table') || '';
  const real = TABLES[table];
  if (!real) return NextResponse.json({ error: 'bad table' }, { status: 400 });
  const { data, error } = await supabaseAdmin().from(real).select('*').order('order_index');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const real = TABLES[body.table];
  if (!real) return NextResponse.json({ error: 'bad table' }, { status: 400 });
  const { data, error } = await supabaseAdmin().from(real).insert(body.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const real = TABLES[body.table];
  if (!real) return NextResponse.json({ error: 'bad table' }, { status: 400 });
  const { data, error } = await supabaseAdmin().from(real).update(body.data).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const table = req.nextUrl.searchParams.get('table') || '';
  const id = req.nextUrl.searchParams.get('id') || '';
  const real = TABLES[table];
  if (!real) return NextResponse.json({ error: 'bad table' }, { status: 400 });
  const { error } = await supabaseAdmin().from(real).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
