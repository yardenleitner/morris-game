'use client';
import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useLiveGame } from '@/lib/useLiveGame';
import { IconTrophy } from '@/lib/icons';
import { Sector } from '@/lib/types';

export default function ScreenPage() {
  const { game, sectors, loading } = useLiveGame();

  if (loading || !game) {
    return <main className="flex-1 flex items-center justify-center text-3xl gold-text">טוען...</main>;
  }

  if (game.stage === 'title') return <TitleScreen />;
  if (game.stage === 'boarding') return <BoardingScreen sectors={sectors} />;
  if (game.stage === 'rules') return <RulesScreen />;
  if (game.stage === 'end') return <WinnerScreen sectors={sectors} />;

  return (
    <main className="flex-1 flex flex-col p-6 gap-5">
      <div className="flex-1 flex items-center justify-center">
        {game.stage === 'trivia' && <Trivia game={game} sectors={sectors} />}
        {game.stage === 'truefalse' && <TrueFalse game={game} sectors={sectors} />}
        {game.stage === 'speech' && <Speech game={game} />}
        {game.stage === 'leaderboard' && <Leaderboard sectors={sectors} />}
      </div>
    </main>
  );
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

function RulesScreen() {
  const rules = [
    { title: 'סבב טריוויה', body: 'הבאזר נפתח עם כל שאלה. מי שלוחצ/ת ראשון/ה עונה בקול. תשובה נכונה: 100+ נקודות. תשובה שגויה: 100- נקודות, והבאזר נפתח שוב לשאר המדורים.' },
    { title: 'קרה / לא קרה', body: 'כל מדור מצביע מהטלפון — "קרה" או "לא קרה" — לפני שנגמרות 15 השניות. אותו ניקוד: 100+ על תשובה נכונה, 100- על תשובה שגויה.' },
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
        new Audio('/sounds/correct.mp3').play().catch(() => {});
      } else {
        new Audio('/sounds/buzzer.mp3').play().catch(() => {});
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
      <div className="mt-auto flex items-center justify-between">
        <ScoreStrip sectors={sectors} lockedBy={game.buzzer_locked_by} />
        <Timer endsAt={game.timer_ends_at} />
      </div>
    </Card>
  );
}

function TrueFalse({ game, sectors }: { game: any; sectors: Sector[] }) {
  const revealed = game.revealed_is_true !== null;
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
                <div className="font-extrabold" style={{ color: s.color }}>{s.name}</div>
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
  return (
    <Card>
      <div className="text-center text-[var(--gold)] font-extrabold text-sm tracking-widest">טבלת מובילים</div>
      <div className="flex-1 flex flex-col justify-center gap-3 max-w-xl w-full mx-auto">
        {ranked.map((s, i) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-2xl px-6 py-3.5"
            style={{ border: `2px solid ${i === 0 ? 'var(--gold)' : '#4d64aa'}`, background: '#0c1642cc', boxShadow: i === 0 ? '0 0 20px #ffbd3d55' : 'none' }}
          >
            <span className="font-black text-xl" style={{ color: i === 0 ? 'var(--gold)' : '#fff' }}>#{i + 1} · {s.name}</span>
            <span className="font-black text-2xl">{s.score}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ScoreStrip({ sectors, lockedBy }: { sectors: Sector[]; lockedBy: string | null }) {
  return (
    <div className="flex gap-2.5">
      {sectors.map((s) => (
        <div key={s.id} className={`text-center rounded-xl px-3.5 py-2 min-w-[96px] ${lockedBy === s.id ? 'flash' : ''}`} style={{ background: '#0a1239d9', border: `1px solid ${lockedBy === s.id ? 'var(--gold)' : '#314786'}`, color: 'var(--muted)' }}>
          <strong className="text-lg text-white block">{s.score}</strong>
          <span className="text-xs">{s.id}</span>
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
  return (
    <div
      className="w-[82px] h-[82px] rounded-full grid place-items-center text-2xl font-black flex-shrink-0"
      style={{ border: `5px solid ${remaining <= 5 ? '#ee6d75' : 'var(--gold)'}`, boxShadow: `0 0 24px ${remaining <= 5 ? '#ee6d7588' : '#ffca42aa'}` }}
    >
      {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
    </div>
  );
}
