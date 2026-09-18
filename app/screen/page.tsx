'use client';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLiveGame } from '@/lib/useLiveGame';
import { Sector } from '@/lib/types';

export default function ScreenPage() {
  const { game, sectors, loading } = useLiveGame();

  if (loading || !game) {
    return <main className="flex-1 flex items-center justify-center text-3xl gold-text">טוען...</main>;
  }

  const leader = [...sectors].sort((a, b) => b.score - a.score)[0];

  return (
    <main className="flex-1 flex flex-col p-8 gap-6">
      <header className="text-center">
        <h1 className="text-4xl md:text-6xl font-black gold-text">מי מכיר את מוריס?</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {game.stage === 'lobby' && <Lobby sectors={sectors} />}
        {game.stage === 'trivia' && <Trivia game={game} sectors={sectors} />}
        {game.stage === 'truefalse' && <TrueFalse game={game} sectors={sectors} />}
        {game.stage === 'speech' && <Speech game={game} />}
        {(game.stage === 'leaderboard' || game.stage === 'end') && (
          <Leaderboard sectors={sectors} isEnd={game.stage === 'end'} winner={leader} />
        )}
      </div>

      <ScoreStrip sectors={sectors} lockedBy={game.buzzer_locked_by} />
    </main>
  );
}

function Lobby({ sectors }: { sectors: Sector[] }) {
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(`${window.location.origin}/play`); }, []);
  return (
    <div className="text-center pop-in">
      <p className="text-2xl text-[var(--muted)] mb-4">סרקו את הקוד והצטרפו מהטלפון</p>
      {url && (
        <div className="bg-white p-4 rounded-2xl inline-block mb-6">
          <QRCodeSVG value={url} size={180} />
        </div>
      )}
      <div className="flex gap-6 justify-center flex-wrap">
        {sectors.map((s) => (
          <div key={s.id} className="rounded-2xl px-6 py-4 border-2" style={{ borderColor: s.color }}>
            <div className="font-black text-xl" style={{ color: s.color }}>{s.name}</div>
            <div className="text-sm text-[var(--muted)] mt-1">{s.connected ? s.rep_name || 'מחובר' : 'ממתין...'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Trivia({ game, sectors }: { game: any; sectors: Sector[] }) {
  const locked = sectors.find((s) => s.id === game.buzzer_locked_by);
  return (
    <div className="w-full max-w-5xl text-center pop-in">
      <p className="text-3xl md:text-5xl font-bold mb-10">{game.current_question_text}</p>
      {game.current_question_options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {game.current_question_options.map((opt: string, i: number) => {
            const isCorrect = game.revealed_correct_index === i;
            const revealed = game.revealed_correct_index !== null;
            return (
              <div
                key={i}
                className={`rounded-xl border-2 p-5 text-xl font-bold transition-colors ${
                  revealed ? (isCorrect ? 'border-green-500 bg-green-500/20' : 'border-white/10 opacity-50') : 'border-white/15'
                }`}
              >
                {String.fromCharCode(1488 + i)}. {opt}
              </div>
            );
          })}
        </div>
      )}
      <Timer endsAt={game.timer_ends_at} />
      <div className="mt-8 h-16">
        {locked && (
          <p className="pop-in flash text-3xl font-black" style={{ color: locked.color }}>
            {locked.name} לחץ/ה ראשון/ה!
          </p>
        )}
        {game.buzzer_open && !locked && <p className="text-xl text-[var(--gold)] buzz-open">הבאזר פתוח!</p>}
      </div>
    </div>
  );
}

function TrueFalse({ game, sectors }: { game: any; sectors: Sector[] }) {
  const revealed = game.revealed_is_true !== null;
  return (
    <div className="w-full max-w-4xl text-center pop-in">
      <p className="text-2xl md:text-4xl font-bold mb-8 leading-relaxed">{game.current_story_text}</p>
      {revealed && (
        <p className={`text-3xl font-black mb-6 ${game.revealed_is_true ? 'text-green-400' : 'text-red-400'}`}>
          {game.revealed_is_true ? 'קרה!' : 'לא קרה!'}
        </p>
      )}
      <div className="flex justify-center gap-4 flex-wrap">
        {sectors.map((s) => {
          const vote = game.current_votes[s.id];
          return (
            <div key={s.id} className="rounded-xl px-4 py-3 border-2 min-w-28" style={{ borderColor: s.color }}>
              <div className="font-bold" style={{ color: s.color }}>{s.name}</div>
              <div className="text-lg mt-1">
                {vote === undefined ? '...' : vote ? 'קרה' : 'לא קרה'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Speech({ game }: { game: any }) {
  return (
    <div className="text-center pop-in">
      <p className="text-2xl text-[var(--muted)] mb-4">שלב נאומי הפרידה — מילות מוקש</p>
      <p className="text-6xl md:text-8xl font-black gold-text">{game.current_word}</p>
      <Timer endsAt={game.timer_ends_at} />
    </div>
  );
}

function Leaderboard({ sectors, isEnd, winner }: { sectors: Sector[]; isEnd: boolean; winner?: Sector }) {
  const ranked = [...sectors].sort((a, b) => b.score - a.score);
  return (
    <div className="w-full max-w-2xl text-center pop-in">
      {isEnd && winner && (
        <div className="mb-8">
          <p className="text-2xl text-[var(--muted)]">והמנצח/ת הוא/היא...</p>
          <p className="text-5xl font-black gold-text mt-2">{winner.name}!</p>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {ranked.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl px-6 py-4 border-2" style={{ borderColor: s.color }}>
            <span className="text-2xl font-black" style={{ color: s.color }}>#{i + 1} {s.name}</span>
            <span className="text-2xl font-black">{s.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreStrip({ sectors, lockedBy }: { sectors: Sector[]; lockedBy: string | null }) {
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {sectors.map((s) => (
        <div
          key={s.id}
          className={`rounded-xl px-4 py-2 border-2 flex items-center gap-2 ${lockedBy === s.id ? 'flash' : ''}`}
          style={{ borderColor: s.color }}
        >
          <span className="font-bold" style={{ color: s.color }}>{s.name}</span>
          <span className="font-black">{s.score}</span>
        </div>
      ))}
    </div>
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
  return <div className={`mt-6 text-5xl font-black ${remaining <= 5 ? 'text-red-500' : 'text-[var(--gold)]'}`}>{remaining}</div>;
}
