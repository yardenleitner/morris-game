// small stroke-based inline icon set — no emoji, matches the mockup style
export function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlay({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'scaleX(-1)' }}>
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}

export function IconPause({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

export function IconStar({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" fill="url(#starGrad)" />
      <defs>
        <linearGradient id="starGrad" x1="3" y1="2" x2="21" y2="20">
          <stop offset="0" stopColor="#fff0a9" />
          <stop offset="1" stopColor="#eb9b2a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconTrophy({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 3h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V3z" stroke="url(#trophyGrad)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 15h6l1 5H8l1-5z" stroke="url(#trophyGrad)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6 4H3v2a4 4 0 0 0 4 4M18 4h3v2a4 4 0 0 1-4 4" stroke="url(#trophyGrad)" strokeWidth="1.6" strokeLinecap="round" />
      <defs>
        <linearGradient id="trophyGrad" x1="3" y1="3" x2="21" y2="20">
          <stop offset="0" stopColor="#fff0a9" />
          <stop offset="1" stopColor="#eb9b2a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconClock({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}>
      <circle cx="12" cy="12" r="9" stroke="#aebbe8" strokeWidth="1.6" />
      <path d="M12 7v5l3.5 2" stroke="#aebbe8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
