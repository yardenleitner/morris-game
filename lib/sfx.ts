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
// Distinct from BUZZER_SOUND on purpose: the buzzer now means "a phone was
// pressed", so the host marking an answer wrong needs its own voice.
export const WRONG_SOUND = '/sounds/wrong-answer.wav';

// ~4x. Loud on purpose: this fires when a sector buzzes in, over a live crowd.
export const BUZZER_GAIN = 4;

// The wrong-answer sample is mastered far quieter than the buzzer (RMS 0.062 vs
// 0.453, peak 0.36 vs 1.0), so matching gains would leave it inaudible next to it.
// Measured through this exact chain, 26 lands at RMS 0.92 against the buzzer's 1.32
// and actually distorts less; past ~30 the limiter eats the difference.
export const WRONG_GAIN = 26;

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    armUnlock(ctx);
  }
  return ctx;
}

// A context created without a user gesture starts suspended, and on the projector
// nobody necessarily clicks anything before the first sector buzzes. Resume on the
// first interaction of any kind so the room is not one silent round behind.
function armUnlock(ac: AudioContext) {
  const unlock = () => {
    ac.resume().catch(() => {});
    if (ac.state === 'running') detach();
  };
  const detach = () => {
    for (const evt of ['pointerdown', 'keydown', 'touchstart']) {
      document.removeEventListener(evt, unlock, true);
    }
  };
  for (const evt of ['pointerdown', 'keydown', 'touchstart']) {
    document.addEventListener(evt, unlock, true);
  }
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
    // NEVER await resume(). Chrome leaves that promise pending indefinitely until a
    // real user gesture arrives, so awaiting it hangs playSfx forever and silently
    // swallows every press. Ask for a resume and move on.
    if (ac.state === 'suspended') {
      ac.resume().catch(() => {});
      // Still blocked: drop this one rather than queue it. A source started against
      // a suspended context fires whenever it resumes, which would dump a pile of
      // stale buzzers into the room the moment somebody finally touches the laptop.
      const state = ac.state as AudioContextState;
      if (state !== 'running') return;
    }

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
