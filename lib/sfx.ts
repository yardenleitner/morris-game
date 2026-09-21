'use client';

// Sound effects go through Web Audio rather than <audio> because an <audio>
// element caps out at volume 1 — already the default — so there is no way to make
// the buzzer cut through a room with the theme music playing. A GainNode can be
// pushed past unity, and a compressor in front of it keeps the extra gain from
// clipping into a crackle.
//
// Decoded buffers are cached per url, so the second press is instant.

export const BUZZER_SOUND = '/sounds/buzzer.mp3';
export const CORRECT_SOUND = '/sounds/correct.mp3';

// ~4x. Loud on purpose: this fires when a sector buzzes in, over a live crowd.
export const BUZZER_GAIN = 4;

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function buffer(ac: AudioContext, url: string): Promise<AudioBuffer> {
  let pending = buffers.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => ac.decodeAudioData(b));
    // a failed fetch must not poison the cache for the rest of the show
    pending.catch(() => buffers.delete(url));
    buffers.set(url, pending);
  }
  return pending;
}

// Fetch + decode ahead of time so the first buzz isn't a beat late.
export function preloadSfx(...urls: string[]) {
  const ac = context();
  if (!ac) return;
  for (const url of urls) buffer(ac, url).catch(() => {});
}

// `rate` shifts playback speed (and so pitch) a little. Two identical samples fired
// at the same instant are phase-identical and just sound like one louder buzzer;
// nudging each voice a few percent makes a pile-up audibly a pile-up.
export async function playSfx(url: string, gain = 1, rate = 1) {
  const ac = context();
  if (!ac) return fallback(url);
  try {
    // autoplay policies suspend the context until the page has been interacted
    // with; by the time anyone buzzes the host has clicked through several screens
    if (ac.state === 'suspended') await ac.resume();

    const source = ac.createBufferSource();
    source.buffer = await buffer(ac, url);
    source.playbackRate.value = rate;

    const amp = ac.createGain();
    amp.gain.value = gain;

    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;

    source.connect(amp).connect(limiter).connect(ac.destination);
    source.start();
  } catch {
    fallback(url);
  }
}

function fallback(url: string) {
  try {
    const audio = new Audio(url);
    audio.volume = 1;
    audio.play().catch(() => {});
  } catch {
    /* no audio on this device */
  }
}
