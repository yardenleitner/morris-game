import { NextRequest, NextResponse } from 'next/server';
import { HOST_KEY } from '@/lib/config';
import { runAction } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

// Every state change goes through here. Host-only actions need the header;
// join/buzz/vote are open, since contestants have no key of their own.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.fn) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const result = runAction(body.fn, body.args ?? {}, req.headers.get('x-host-key') === HOST_KEY);
  if ('error' in result) {
    return NextResponse.json(result, { status: result.error === 'unauthorized' ? 401 : 400 });
  }
  return NextResponse.json(result);
}
