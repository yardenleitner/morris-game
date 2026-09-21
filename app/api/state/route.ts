import { NextResponse } from 'next/server';
import { publicState } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

// Snapshot used for the first paint and whenever a client reconnects — a phone
// waking from sleep re-reads this rather than trusting whatever it last saw.
export function GET() {
  return NextResponse.json(publicState(), { headers: { 'Cache-Control': 'no-store' } });
}
