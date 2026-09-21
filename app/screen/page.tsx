'use client';
import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useLiveGame } from '@/lib/useLiveGame';
import { IconTrophy, IconPlay, IconPause } from '@/lib/icons';
import { ScoreBar, ScoreGauge, scoreScale } from '@/lib/ScoreBar';
import { BUZZER_GAIN, BUZZER_SOUND, CORRECT_SOUND, WRONG_SOUND, playSfx, preloadSfx } from '@/lib/sfx';
import { BuzzEvent, GameState, Sector } from '@/lib/types';

const VOLUME_KEY = 'morris-music-volume';
const PAUSED_KEY = 'morris-music-paused';

function useThemeMusic(active: boolean) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const started = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [paused, setPaused] = useState(() => typeof window !== 'undefined' && localStorage.getItem(PAUSED_KEY) === '1');
  const [volume, setVolume] = useState(() => {
    if (typeof window === 'undefined') return 0.5;
    const stored = Number(localStorage.getItem(VOLUME_KEY));
    return stored > 0 && stored <= 1 ? stored : 0.5;
  });

  // keep the element's live volume in sync + remember it for next time
  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  // start the music once the show becomes active, then follow paused/resume
  useEffect(() => {
    const audio = ref.current;
    if (!audio || !active) return;
    if (!started.current) {
      started.current = true;
      audio.currentTime = 0;
      audio.volume = volume;
    }
    if (paused) {
      audio.pause();
    } else {
      audio.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
    }
    // volume is only read on first start here; live changes are handled above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused]);

  useEffect(() => () => { ref.current?.pause(); }, []);

  const enableSound = () => {
    ref.current?.play().then(() => setNeedsTap(false)).catch(() => {});
  };

  const togglePaused = () => setPaused((p) => {
    const next = !p;
    localStorage.setItem(PAUSED_KEY, next ? '1' : '0');
    return next;
  });

  return { ref, needsTap, paused, volume, setVolume, enableSound, togglePaused };
}

function MusicControls({
  needsTap, paused, volume, onVolumeChange, onToggle,
}: {
  needsTap: boolean; paused: boolean; volume: number; onVolumeChange: (v: number) => void; onToggle: () => void;
}) {
  const showPlayIcon = needsTap || paused;
  return (
    <div
      className="fixed top-6 left-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full"
      style={{ background: '#0c1642dd', border: '1px solid #4d64aa', backdropFilter: 'blur(6px)' }}
    >
      <button
        onClick={onToggle}
        className="w-9 h-9 rounded-full grid place-items-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#fff0a9,#eb9b2a)', color: '#201305' }}
        aria-label={showPlayIcon ? 'הפעל מוזיקה' : 'השהה מוזיקה'}
        title={needsTap ? 'הפעילו סאונד' : showPlayIcon ? 'הפעל מוזיקה' : 'השהה מוזיקה'}
      >
        {showPlayIcon ? <IconPlay size={13} /> : <IconPause size={13} />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        className="w-24"
        style={{ accentColor: 'var(--gold)' }}
        aria-label="עוצמת קול"
      />
    </div>
  );
}

// Sounds one buzzer per press the server has logged.
//
// The screen is the room's speaker, so it plays every press rather than only the
// winning one: if four reps slam the button at once, four buzzers land together.
// Ids only ever climb, so "what have I already played" is a single number.
function useBuzzSounds(events: BuzzEvent[] | undefined) {
  const playedUpTo = useRef<number | null>(null);

  useEffect(() => {
    const log = events ?? [];
    const highest = log.reduce((max, e) => Math.max(max, e.id), 0);

    // First snapshot only arms the ref. Opening or refreshing /screen replays the
    // whole log, and none of it is news — those presses already happened.
    if (playedUpTo.current === null) { playedUpTo.current = highest; return; }
    // A host reset rewinds the counter; re-arm instead of replaying the backlog.
    if (highest < playedUpTo.current) { playedUpTo.current = highest; return; }

    const fresh = log.filter((e) => e.id > playedUpTo.current!);
    if (!fresh.length) return;
    playedUpTo.current = highest;

    // All at once — presses that arrived together should be heard together.
    //
    // The detune is keyed on the event id, not on this batch's index. Each press
    // commits and broadcasts on its own, so near-simultaneous slams arrive as
    // separate pushes that each look like "one new event"; indexing by batch gave
    // every voice the same rate, and identical samples fired micro-seconds apart
    // are phase-aligned — five buzzers summing into one louder buzzer. Off the id,
    // consecutive presses always differ and the pile-up sounds like a pile-up.
    fresh.forEach((e) => playSfx(BUZZER_SOUND, BUZZER_GAIN, 1 + (e.id % 4) * 0.035));
  }, [events]);
}

export default function ScreenPage() {
  const { game, sectors, loading } = useLiveGame();
  const musicActive = !!game;
  useEffect(() => { preloadSfx(BUZZER_SOUND, CORRECT_SOUND, WRONG_SOUND); }, []);
  useBuzzSounds(game?.buzz_events);
  const { ref: musicRef, needsTap, paused, volume, setVolume, enableSound, togglePaused } = useThemeMusic(musicActive);

  if (loading || !game) {
    return <main className="flex-1 flex items-center justify-center text-3xl gold-text">טוען...</main>;
  }

  const music = (
    <>
      <audio ref={musicRef} src="/theme-music.mp3" loop preload="auto" />
      <MusicControls
        needsTap={needsTap}
        paused={paused}
        volume={volume}
        onVolumeChange={setVolume}
        onToggle={needsTap ? enableSound : togglePaused}
      />
    </>
  );

  let content: React.ReactNode;
  if (game.stage === 'title') content = <TitleScreen />;
  else if (game.stage === 'boarding') content = <BoardingScreen sectors={sectors} />;
  else if (game.stage === 'rules') content = <RulesScreen game={game} />;
  else if (game.stage === 'end') content = <WinnerScreen sectors={sectors} />;
  else {
    content = (
      <main className="flex-1 flex flex-col p-6 gap-5">
        <div className="flex-1 flex items-center justify-center min-h-0">
          {game.stage === 'trivia' && <Trivia game={game} sectors={sectors} />}
          {game.stage === 'truefalse' && <TrueFalse game={game} sectors={sectors} />}
          {game.stage === 'speech' && <Speech game={game} />}
          {game.stage === 'leaderboard' && <Leaderboard sectors={sectors} />}
        </div>
        {/* the leaderboard is already a full-screen ranking — a gauge under it would
            just say the same thing twice */}
        {game.stage !== 'leaderboard' && <ScoreGauge sectors={sectors} lockedBy={game.buzzer_locked_by} />}
      </main>
    );
  }

  return <>{music}{content}</>;
}

function TitleScreen() {
  return (
    <main
      className="flex-1 relative overflow-hidden flex flex-col items-center justify-end text-center gap-6 px-10 pb-14"
      style={{
        backgroundImage: "linear-gradient(180deg,rgba(5,10,34,0),rgba(5,10,34,.6) 88%),url('/title-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute top-7 right-9"><span className="live-dot"><i />שידור חי</span></div>
      <div className="pop-in flex flex-col items-center gap-4 relative z-10">
        <p className="text-lg md:text-2xl text-[var(--muted)] font-semibold" style={{ textShadow: '0 2px 14px rgba(0,0,0,.9)' }}>שעשועון פרידה חגיגי · חמישה מדורים, משימה אחת</p>
        <div className="px-6 py-3 rounded-full font-extrabold text-[#201305]" style={{ background: 'linear-gradient(135deg,#fff0a9,#eb9b2a)', border: '1px solid #ffd878' }}>
          ממתינים למנחה שיתחיל...
        </div>
      </div>
    </main>
  );
}

function BoardingScreen({ sectors }: { sectors: Sector[] }) {
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(`${window.location.origin}/play`); }, []);
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center gap-8 p-10"
      style={{
        backgroundImage: "linear-gradient(180deg,rgba(5,10,34,.35),rgba(5,10,34,.88) 78%),url('/boarding-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="text-center">
        <div className="text-sm font-extrabold text-[var(--gold)] tracking-widest">מי מכיר את מוריס?</div>
        <h1 className="mt-1 text-3xl md:text-4xl font-extrabold">סרקו והצטרפו מהטלפון</h1>
      </div>
      {url && (
        <div className="bg-white p-3 rounded-2xl shadow-2xl">
          <QRCodeSVG value={url} size={190} />
        </div>
      )}
      <div className="flex gap-4 flex-wrap justify-center max-w-4xl">
        {sectors.map((s) => (
          <div key={s.id} className="rounded-2xl px-5 py-4 text-center min-w-[150px]" style={{ background: '#0c1642cc', border: `2px ${s.connected ? 'solid' : 'dashed'} ${s.connected ? s.color : '#4d64aa'}` }}>
            <div className="font-extrabold text-lg" style={{ color: s.color }}>{s.name}</div>
            <div className="text-sm text-[var(--muted)] mt-1">{s.connected ? `${s.rep_name} · מחובר` : 'ממתין להצטרפות...'}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

// Point values are read off the game row rather than written into the copy, so the
// rules the room is shown can't drift from what scoring actually does.
function RulesScreen({ game }: { game: GameState }) {
  const plus = `+${game.scoring_correct}`;
  const minus = `${game.scoring_wrong}`;
  const rules = [
    { title: 'סבב טריוויה', body: `הבאזר נפתח עם כל שאלה. מי שלוחצ/ת ראשון/ה עונה בקול. תשובה נכונה: ${plus} נקודות. תשובה שגויה: ${minus} נקודות, והבאזר נפתח שוב לשאר המדורים.` },
    { title: 'קרה / לא קרה', body: `כל מדור מצביע מהטלפון — "קרה" או "לא קרה" — לפני שנגמרות 15 השניות. אותו ניקוד: ${plus} על תשובה נכונה, ${minus} על תשובה שגויה.` },
    { title: 'נאומי הפרידה · מילות מוקש', body: 'בסבב האחרון כל דובר/ת מקבל/ת מילה שחייבים לשלב בנאום בלי שישימו לב.' },
  ];
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 p-10">
      <div className="text-center">
        <div className="text-sm font-extrabold text-[var(--gold)] tracking-widest">מי מכיר את מוריס?</div>
        <h1 className="mt-1 text-3xl md:text-4xl font-extrabold">חוקי המשחק</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full">
        {rules.map((r) => (
          <div key={r.title} className="rounded-2xl p-6" style={{ background: '#0c1642cc', border: '1px solid #4d64aa' }}>
            <div className="font-black text-lg text-[var(--gold)] mb-2">{r.title}</div>
            <p className="text-[var(--muted)] leading-relaxed">{r.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function WinnerScreen({ sectors }: { sectors: Sector[] }) {
  const ranked = [...sectors].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  return (
    <main
      className="flex-1 relative overflow-hidden flex flex-col items-center justify-center text-center gap-4 px-10"
      style={{
        backgroundImage: "linear-gradient(180deg,rgba(5,10,34,.3),rgba(5,10,34,.85) 75%),url('/winner-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="pop-in flex flex-col items-center gap-4">
        <IconTrophy size={64} />
        <p className="text-xl text-[var(--muted)] font-semibold">והמנצח/ת הוא/היא...</p>
        <h1 className="text-6xl md:text-8xl font-black gold-text leading-none">{winner?.name}</h1>
        <div className="flex gap-3 mt-5 flex-wrap justify-center">
          {ranked.slice(1).map((s, i) => (
            <div key={s.id} className="rounded-xl px-4 py-2.5 text-sm" style={{ background: '#0a1239d9', border: '1px solid #314786', color: 'var(--muted)' }}>
              #{i + 2} · {s.name} · {s.score}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="screen-card w-full flex flex-col" style={{ maxWidth: 1180, aspectRatio: '16/9', padding: '38px 46px' }}>
      {children}
    </div>
  );
}

function LiveHeader({ left }: { left: string }) {
  return (
    <div className="flex justify-between text-[var(--muted)] text-base">
      <span>{left}</span>
      <span className="live-dot"><i />שידור חי</span>
    </div>
  );
}

function Trivia({ game, sectors }: { game: any; sectors: Sector[] }) {
  const locked = sectors.find((s) => s.id === game.buzzer_locked_by);
  const revealed = game.revealed_correct_index !== null;
  const awarded = sectors.find((s) => s.id === game.winner_sector_id);
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    const key = `${game.current_question_id}:${game.winner_sector_id}`;
    if (game.last_award_correct !== null && firedFor.current !== key) {
      firedFor.current = key;
      if (game.last_award_correct === true) {
        confetti({ particleCount: 160, spread: 80, origin: { y: 0.5 }, colors: ['#ffcf63', '#eb9b2a', '#58a9ff', '#ffffff'] });
        playSfx(CORRECT_SOUND, 2);
      } else {
        playSfx(WRONG_SOUND, 2);
      }
    }
  }, [game.current_question_id, game.winner_sector_id, game.last_award_correct]);

  return (
    <Card>
      <LiveHeader left="סבב טריוויה" />
      <div className="text-center my-8 font-extrabold" style={{ fontSize: 'clamp(24px,2.8vw,38px)' }}>{game.current_question_text}</div>
      {game.current_question_options && (
        <div className="grid grid-cols-2 gap-3.5 max-w-3xl w-full mx-auto">
          {game.current_question_options.map((opt: string, i: number) => {
            const isCorrect = game.revealed_correct_index === i;
            return (
              <div
                key={i}
                className="rounded-2xl px-5 py-4 flex items-center gap-3.5 text-xl transition-colors"
                style={{
                  border: `1px solid ${isCorrect && revealed ? 'var(--gold)' : '#6075bb'}`,
                  background: isCorrect && revealed ? '#53391588' : '#0c1642cc',
                  boxShadow: isCorrect && revealed ? '0 0 20px #ffbd3d88' : 'none',
                  opacity: revealed && !isCorrect ? 0.45 : 1,
                }}
              >
                <b className="w-8 h-8 rounded-full grid place-items-center text-sm flex-shrink-0" style={{ color: '#19214a', background: isCorrect && revealed ? 'var(--gold)' : '#cad7ff' }}>
                  {String.fromCharCode(1488 + i)}
                </b>
                {opt}
              </div>
            );
          })}
        </div>
      )}
      <div className="text-center mt-5 h-12">
        {locked && game.last_award_correct === null && (
          <span className="pop-in inline-block px-6 py-2.5 rounded-full font-extrabold text-lg" style={{ background: '#3e301d', border: '1px solid var(--gold)', color: 'var(--gold)' }}>
            {locked.name} לחץ/ה ראשון/ה!
          </span>
        )}
        {game.last_award_correct === true && awarded && (
          <span className="pop-in inline-block px-6 py-2.5 rounded-full font-extrabold text-lg" style={{ background: '#153e1f', border: '1px solid #4ade80', color: '#7bda92' }}>
            {awarded.name} ענה/תה נכון! +{game.scoring_correct}
          </span>
        )}
        {game.last_award_correct === false && awarded && (
          <span className="pop-in inline-block px-6 py-2.5 rounded-full font-extrabold text-lg" style={{ background: '#4a1a1a', border: '1px solid #ee6d75', color: '#ff9d9d' }}>
            {awarded.name} טעה/תה! {game.scoring_wrong} · הבאזר פתוח לשאר המדורים
          </span>
        )}
        {revealed && game.last_award_correct === null && (
          <span className="pop-in inline-block px-6 py-2.5 rounded-full font-extrabold text-lg" style={{ background: '#153e1f', border: '1px solid #4ade80', color: '#7bda92' }}>
            התשובה נחשפה
          </span>
        )}
      </div>
      <div className="mt-auto flex items-center justify-end">
        <Timer endsAt={game.timer_ends_at} />
      </div>
    </Card>
  );
}

function TrueFalse({ game, sectors }: { game: any; sectors: Sector[] }) {
  const revealed = game.revealed_is_true !== null;
  const max = scoreScale(sectors.map((s) => s.score));
  return (
    <Card>
      <LiveHeader left="קרה או לא קרה" />
      <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
        <p className="max-w-3xl font-bold leading-relaxed" style={{ fontSize: 'clamp(20px,2.4vw,30px)' }}>{game.current_story_text}</p>
        {revealed && (
          <p className={`text-3xl font-black ${game.revealed_is_true ? 'text-green-400' : 'text-red-400'}`}>
            {game.revealed_is_true ? 'קרה!' : 'לא קרה!'}
          </p>
        )}
        <div className="flex gap-4 flex-wrap justify-center">
          {sectors.map((s) => {
            const vote = game.current_votes[s.id];
            return (
              <div key={s.id} className="rounded-2xl px-5 py-3.5 text-center min-w-[120px]" style={{ border: `2px solid ${s.color}` }}>
                <ScoreBar value={s.score} max={max} color={s.color} />
                <div className="font-extrabold mt-2" style={{ color: s.color }}>{s.name}</div>
                <div className="text-lg mt-1 font-bold">{vote === undefined ? '...' : vote ? 'קרה' : 'לא קרה'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function Speech({ game }: { game: any }) {
  return (
    <Card>
      <LiveHeader left="שלב נאומי הפרידה · מילות מוקש" />
      <div className="flex-1 flex flex-col items-center justify-center gap-7 text-center">
        <div className="text-lg text-[var(--muted)]">המילה הבאה שיש לשלב בנאום:</div>
        <div className="font-black gold-text" style={{ fontSize: 'clamp(52px,9vw,110px)' }}>{game.current_word}</div>
      </div>
      <div className="flex justify-center"><Timer endsAt={game.timer_ends_at} /></div>
    </Card>
  );
}

function Leaderboard({ sectors }: { sectors: Sector[] }) {
  const ranked = [...sectors].sort((a, b) => b.score - a.score);
  const max = scoreScale(ranked.map((s) => s.score));
  return (
    <Card>
      <div className="text-center text-[var(--gold)] font-extrabold text-sm tracking-widest">טבלת מובילים</div>
      <div className="flex-1 flex flex-col justify-center gap-3 max-w-xl w-full mx-auto">
        {ranked.map((s, i) => (
          <div
            key={s.id}
            className="rounded-2xl px-6 py-3.5"
            style={{ border: `2px solid ${i === 0 ? 'var(--gold)' : '#4d64aa'}`, background: '#0c1642cc', boxShadow: i === 0 ? '0 0 20px #ffbd3d55' : 'none' }}
          >
            <ScoreBar value={s.score} max={max} color={s.color} height={10} />
            <div className="flex items-center justify-between mt-2.5">
              <span className="font-black text-xl" style={{ color: i === 0 ? 'var(--gold)' : '#fff' }}>#{i + 1} · {s.name}</span>
              <span className="font-black text-2xl">{s.score}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Timer({ endsAt }: { endsAt: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  if (remaining === null) return null;
  return (
    <div
      className="w-[82px] h-[82px] rounded-full grid place-items-center text-2xl font-black flex-shrink-0"
      style={{ border: `5px solid ${remaining <= 5 ? '#ee6d75' : 'var(--gold)'}`, boxShadow: `0 0 24px ${remaining <= 5 ? '#ee6d7588' : '#ffca42aa'}` }}
    >
      {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
    </div>
  );
}
