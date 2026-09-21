'use client';
import { HOST_KEY } from './config';

async function post(fn: string, args: Record<string, unknown>, headers: Record<string, string>) {
  const res = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ fn, args }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `${res.status}`);
  return body?.data;
}

// Host screens. Surfaces failures out loud: a silently dropped click mid-show is
// worse than an alert the host can react to.
export async function hostAction(fn: string, args: Record<string, unknown> = {}) {
  try {
    return await post(fn, args, { 'x-host-key': HOST_KEY });
  } catch (e) {
    alert(`שגיאה (${fn}): ${e instanceof Error ? e.message : e}`);
  }
}

// Contestants' phones — join, buzz, vote. No host key.
export function playerAction(fn: string, args: Record<string, unknown> = {}) {
  return post(fn, args, {});
}
