'use client';

// Score bars shown above every sector, filled in that sector's own colour so the
// board reads at a glance from across the room.
//
// Bars are scaled against the current leader rather than a fixed maximum: with a
// point per correct answer nobody knows the final ceiling mid-show, and a bar
// scaled to "18 possible points" would sit nearly empty all evening.

// A wrong answer costs a point, so scores can go negative — the floor of 1 keeps
// an all-zero (or all-negative) board from dividing by zero or, worse, painting
// five full bars before a single question has been answered.
export function scoreScale(scores: number[]) {
  return Math.max(1, ...scores);
}

export function ScoreBar({
  value,
  max,
  color,
  height = 8,
}: {
  value: number;
  max: number;
  color: string;
  height?: number;
}) {
  const filled = Math.max(0, Math.min(1, value / max));
  const negative = value < 0;
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{
        height,
        background: '#070d2e',
        // a sector in the red gets an outlined-red track instead of a bar it
        // cannot have: there is nothing to fill, but the state still has to show
        border: `1px solid ${negative ? '#ee6d7577' : '#31478677'}`,
      }}
      role="presentation"
    >
      <div
        style={{
          width: `${filled * 100}%`,
          height: '100%',
          background: color,
          boxShadow: `0 0 10px ${color}aa`,
          borderRadius: 999,
          transition: 'width .55s cubic-bezier(.22,1,.36,1)',
        }}
      />
    </div>
  );
}

// The standings panel shown on /screen under the live card.
//
// It lives OUTSIDE the 16/9 card on purpose: that card is `overflow:hidden` with a
// fixed aspect ratio, so anything at its bottom edge silently disappears the moment
// the content is taller than the box — which is exactly what happened to the score
// strip that used to sit in there. Out here it cannot be clipped away.
export function ScoreGauge({
  sectors,
  lockedBy,
}: {
  sectors: { id: string; name: string; color: string; score: number }[];
  lockedBy?: string | null;
}) {
  const max = scoreScale(sectors.map((s) => s.score));
  return (
    <div className="w-full mx-auto flex gap-3" style={{ maxWidth: 1180 }}>
      {sectors.map((s) => (
        <div
          key={s.id}
          className={`flex-1 rounded-2xl px-4 py-3 ${lockedBy === s.id ? 'flash' : ''}`}
          style={{
            background: '#0a1239d9',
            border: `1px solid ${lockedBy === s.id ? 'var(--gold)' : '#314786'}`,
          }}
        >
          <ScoreBar value={s.score} max={max} color={s.color} height={12} />
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-extrabold text-base" style={{ color: s.color }}>{s.name}</span>
            <strong className="text-2xl font-black text-white tabular-nums">{s.score}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
