import { NextRequest, NextResponse } from 'next/server';
import { HOST_KEY } from '@/lib/config';
import { contentDelete, contentInsert, contentList, contentUpdate, isContentTable } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

// The content editor at /host/content. Host-only: these rows carry the answers,
// which is why they are never part of the state sent to /play.
function authed(req: NextRequest) {
  return req.headers.get('x-host-key') === HOST_KEY;
}

const unauthorized = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 });
const badTable = () => NextResponse.json({ error: 'bad table' }, { status: 400 });

export async function GET(req: NextRequest) {
  if (!authed(req)) return unauthorized();
  const table = req.nextUrl.searchParams.get('table') || '';
  if (!isContentTable(table)) return badTable();
  return NextResponse.json({ data: contentList(table) });
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return unauthorized();
  const body = await req.json();
  if (!isContentTable(body.table)) return badTable();
  return NextResponse.json({ data: contentInsert(body.table, body.data) });
}

export async function PUT(req: NextRequest) {
  if (!authed(req)) return unauthorized();
  const body = await req.json();
  if (!isContentTable(body.table)) return badTable();
  const data = contentUpdate(body.table, body.id, body.data);
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  if (!authed(req)) return unauthorized();
  const table = req.nextUrl.searchParams.get('table') || '';
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!isContentTable(table)) return badTable();
  contentDelete(table, id);
  return NextResponse.json({ ok: true });
}
