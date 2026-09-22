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

// The standings panel shown on /screen under the live card: one Grafana-style bar
// gauge holding all five sectors instead of five separate boxes.
//
// Every bar hangs off a single baseline drawn straight across the panel, growing up
// from it when a sector is in the black and down from it when it is in the red. That
// is the reason for one box rather than five: side by side against a shared zero, the
// bars are read against each other at a glance, which is what the room actually wants
// to know. Five boxed bars each with their own track could only be compared by
// reading the numbers.
//
// It lives OUTSIDE the 16/9 card on purpose: that card is `overflow:hidden` with a
// fixed aspect ratio, so anything at its bottom edge silently disappears the moment
// the content is taller than the box — which is exactly what happened to the score
// strip that used to sit in there. Out here it cannot be clipped away.

// Where the baseline falls and how much score one plot's worth of height is.
//
// The span runs from the leader down to whoever is deepest in the red, so the two
// extremes always reach the ends of the plot — same reasoning as scoreScale, which
// this replaces for the gauge: mid-show nobody knows the evening's ceiling, and a
// plot scaled to "18 possible points" would sit nearly flat all night.
export function gaugeDomain(scores: number[]) {
  const hi = Math.max(0, ...scores);
  const lo = Math.min(0, ...scores);
  const span = hi - lo;
  return {
    span,
    // The baseline as a fraction of the plot, measured from the top. With nobody
    // in the red that is 1 — the floor — and every bar grows up from it.
    zeroFrac: span === 0 ? 1 : hi / span,
  };
}

// Breathing room above and below the plot for the value riding each bar's tip. The
// leader's bar reaches the top of the plot by definition, so without a gutter its
// number would spill out of the panel.
const TIP_GUTTER = 28;

const EASE = 'cubic-bezier(.22,1,.36,1)';

export function ScoreGauge({
  sectors,
  lockedBy,
  plotHeight = 132,
}: {
  sectors: { id: string; name: string; color: string; score: number }[];
  lockedBy?: string | null;
  plotHeight?: number;
}) {
  const { span, zeroFrac } = gaugeDomain(sectors.map((s) => s.score));
  const baseline = TIP_GUTTER + zeroFrac * plotHeight;
  // The same line measured from the plot's bottom edge, which is where an upward
  // bar starts and what its tip is offset from.
  const fromFloor = TIP_GUTTER + (1 - zeroFrac) * plotHeight;

  return (
    <div
      className="w-full mx-auto rounded-2xl px-5 py-3"
      style={{ maxWidth: 1180, background: '#0a1239d9', border: '1px solid #314786' }}
    >
      <div className="relative" style={{ height: plotHeight + TIP_GUTTER * 2 }}>
        <div className="absolute inset-0 flex gap-3">
          {sectors.map((s) => {
            const size = span === 0 ? 0 : (Math.abs(s.score) / span) * plotHeight;
            // Zero counts as up so a sector yet to score still labels its own
            // column, sitting just above the line with nothing drawn.
            const up = s.score >= 0;
            const locked = lockedBy === s.id;
            return (
              <div key={s.id} className={`relative flex-1 ${locked ? 'flash' : ''}`}>
                {/* faint full-range track, so a sector on zero is still a column */}
                <div
                  className="absolute left-0 right-0 rounded-lg"
                  style={{
                    top: TIP_GUTTER,
                    height: plotHeight,
                    background: '#070d2e88',
                    border: `1px solid ${locked ? 'var(--gold)' : '#31478655'}`,
                  }}
                />
                <div
                  className="absolute left-0 right-0"
                  style={{
                    height: size,
                    ...(up ? { bottom: fromFloor } : { top: baseline }),
                    background: `linear-gradient(${up ? 'to top' : 'to bottom'}, ${s.color}, ${s.color}bb)`,
                    boxShadow: `0 0 12px ${s.color}66`,
                    // square at the baseline, rounded at the tip
                    borderRadius: up ? '6px 6px 2px 2px' : '2px 2px 6px 6px',
                    transition: `height .55s ${EASE}, top .55s ${EASE}, bottom .55s ${EASE}`,
                  }}
                />
                <div
                  dir="ltr"
                  className="absolute left-0 right-0 text-center font-black tabular-nums text-xl leading-none"
                  style={{
                    color: s.color,
                    ...(up ? { bottom: fromFloor + size + 5 } : { top: baseline + size + 5 }),
                    transition: `top .55s ${EASE}, bottom .55s ${EASE}`,
                  }}
                >
                  {s.score}
                </div>
              </div>
            );
          })}
        </div>
        {/* The shared zero line — the whole point of one panel instead of five.
            Drawn last so it lands on top of the column tracks, which are
            translucent enough to swallow a line painted behind them. */}
        <div
          className="absolute left-0 right-0"
          style={{ top: baseline, height: 1, background: '#8ea4e8', boxShadow: '0 0 6px #5871c8aa' }}
        />
      </div>
      {/* sector names on the axis, in the same order as the columns above */}
      <div className="flex gap-3">
        {sectors.map((s) => (
          <div
            key={s.id}
            className="flex-1 text-center font-extrabold text-base"
            style={{ color: lockedBy === s.id ? 'var(--gold)' : s.color }}
          >
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
