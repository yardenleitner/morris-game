'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, HOST_KEY } from '@/lib/supabaseClient';
import { useLiveGame } from '@/lib/useLiveGame';
import { IconCheck, IconX, IconPlay } from '@/lib/icons';
import { Stage, TriviaQuestion, TrueFalseStory, SpeechWord, SectorId } from '@/lib/types';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'title', label: 'פתיחה' },
  { id: 'boarding', label: 'רישום' },
  { id: 'trivia', label: 'טריוויה' },
  { id: 'truefalse', label: 'קרה/לא קרה' },
  { id: 'speech', label: 'נאומים' },
  { id: 'leaderboard', label: 'טבלת מובילים' },
  { id: 'end', label: 'סיום' },
];

async function call(fn: string, args: Record<string, any> = {}) {
  const { error } = await supabase.rpc(fn, { p_key: HOST_KEY, ...args });
  if (error) alert(`שגיאה (${fn}): ${error.message}`);
}

export default function HostPage() {
  const { game, sectors, loading } = useLiveGame();
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [stories, setStories] = useState<TrueFalseStory[]>([]);
  const [words, setWords] = useState<SpeechWord[]>([]);
  const [showManualStages, setShowManualStages] = useState(false);

  const loadContent = useCallback(async () => {
    const headers = { 'x-host-key': HOST_KEY };
    const [q, s, w] = await Promise.all([
      fetch('/api/content?table=questions', { headers }).then((r) => r.json()),
      fetch('/api/content?table=stories', { headers }).then((r) => r.json()),
      fetch('/api/content?table=words', { headers }).then((r) => r.json()),
    ]);
    setQuestions(q.data ?? []);
    setStories(s.data ?? []);
    setWords(w.data ?? []);
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  if (loading || !game) return <main className="flex-1 flex items-center justify-center">טוען...</main>;

  return (
    <main className="flex-1 p-4 md:p-6 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-black gold-text">מסך מנחה — מי מכיר את מוריס?</h1>
        <div className="flex gap-2">
          <Link href="/host/content" className="btn text-sm">עריכת תוכן</Link>
          <Link href="/screen" target="_blank" className="btn text-sm">מסך הקרנה ↗</Link>
          <button onClick={() => confirm('לאפס את כל המשחק? הניקוד והמצב יימחקו.') && call('host_reset_game')} className="btn danger text-sm">
            איפוס משחק
          </button>
        </div>
      </header>

      {game.stage === 'title' && <TitleStage />}
      {game.stage === 'boarding' && <BoardingStage sectors={sectors} />}
      {game.stage === 'trivia' && <TriviaControls game={game} questions={questions} sectors={sectors} onUsed={loadContent} />}
      {game.stage === 'truefalse' && <TrueFalseControls game={game} stories={stories} onUsed={loadContent} />}
      {game.stage === 'speech' && <SpeechControls game={game} words={words} />}
      {(game.stage === 'leaderboard' || game.stage === 'end') && <EndControls stage={game.stage} />}

      {(game.stage === 'trivia' || game.stage === 'truefalse' || game.stage === 'speech') && (
        <SectorsGrid sectors={sectors} />
      )}

      <section className="host-card p-4">
        <button onClick={() => setShowManualStages((v) => !v)} className="text-sm text-[var(--muted)]">
          {showManualStages ? '▲ הסתר מעבר ידני בין שלבים' : '▼ מעבר ידני בין שלבים (לחזרות / תקלות)'}
        </button>
        {showManualStages && (
          <div className="flex gap-2 flex-wrap mt-3">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => call('host_set_stage', { p_stage: s.id })}
                className={`btn text-sm ${game.stage === s.id ? 'gold' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {(game.stage === 'trivia' || game.stage === 'truefalse') && <ScoringSettings game={game} />}
    </main>
  );
}

function TitleStage() {
  return (
    <section className="host-card p-8 flex flex-col items-center gap-4 text-center">
      <h2 className="text-xl font-bold text-[var(--gold)]">מסך הפתיחה מוקרן כרגע</h2>
      <p className="text-[var(--muted)] max-w-md">הקהל רואה את כותרת המשחק. כשמוכנים, פתח את שלב הרישום — במסך הגדול יופיע QR להצטרפות הנציגים.</p>
      <button onClick={() => call('host_set_stage', { p_stage: 'boarding' })} className="btn gold text-lg px-8 py-4">
        פתח רישום נציגים <IconPlay />
      </button>
    </section>
  );
}

function BoardingStage({ sectors }: { sectors: any[] }) {
  const connectedCount = sectors.filter((s) => s.connected).length;
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="host-card p-6 flex flex-col">
        <h2 className="text-lg font-bold text-[var(--gold)] mb-2">שלב רישום נציגים</h2>
        <p className="text-[var(--muted)] text-sm">המסך הגדול מציג QR להצטרפות. אשר שכולם התחברו ואז התחל את המשחק.</p>
        <div className="mt-auto pt-4 flex flex-col gap-3">
          <div className="btn done justify-center flex items-center gap-2"><IconCheck />רישום פתוח — מוצג במסך</div>
          <button onClick={() => call('host_set_stage', { p_stage: 'trivia' })} className="btn gold text-lg py-4 flex items-center justify-center gap-2">
            התחל את המשחק <IconPlay />
          </button>
        </div>
      </div>
      <div className="host-card p-6">
        <h2 className="text-lg font-bold text-[var(--gold)] mb-3">נציגים מחוברים ({connectedCount}/5)</h2>
        <div className="flex flex-col">
          {sectors.map((s) => (
            <div key={s.id} className="flex justify-between border-b border-white/10 py-2.5 text-sm">
              <span style={{ color: s.color }} className="font-semibold">{s.name}</span>
              <span className="flex items-center gap-2 text-[var(--muted)]">
                <i className={`w-2.5 h-2.5 rounded-full inline-block ${s.connected ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-white/20'}`} />
                {s.connected ? s.rep_name : 'ממתין'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EndControls({ stage }: { stage: Stage }) {
  return (
    <section className="host-card p-6 flex items-center justify-between flex-wrap gap-3">
      <p className="text-[var(--muted)]">{stage === 'leaderboard' ? 'הקהל רואה את טבלת המובילים המעודכנת.' : 'הקהל רואה את מסך המנצח החגיגי.'}</p>
      {stage === 'leaderboard' && (
        <button onClick={() => call('host_set_stage', { p_stage: 'end' })} className="btn gold flex items-center gap-2">הכריזו על מנצח <IconPlay /></button>
      )}
    </section>
  );
}

function TriviaControls({ game, questions, sectors, onUsed }: any) {
  const unused = questions.filter((q: TriviaQuestion) => !q.used);
  const locked = sectors.find((s: any) => s.id === game.buzzer_locked_by);
  return (
    <section className="host-card p-5 flex flex-col gap-3">
      <h2 className="font-bold text-[var(--gold)]">שלב טריוויה</h2>
      <div className="flex gap-2 flex-wrap items-center">
        <select
          className="bg-black/30 rounded-lg px-3 py-2 flex-1 min-w-[200px] border border-[#5367a9]"
          onChange={async (e) => { if (e.target.value) { await call('host_load_question', { p_question_id: e.target.value }); onUsed(); } }}
          value=""
        >
          <option value="">בחר שאלה ({unused.length} נותרו)...</option>
          {questions.map((q: TriviaQuestion) => (
            <option key={q.id} value={q.id} disabled={q.used}>{q.order_index}. {q.question} {q.used ? '(נענתה)' : ''}</option>
          ))}
        </select>
        <button onClick={() => call('host_open_buzzer')} className="btn blue">פתח באזר</button>
        <button onClick={() => call('host_close_buzzer')} className="btn">סגור באזר</button>
        <button onClick={() => call('host_new_round')} className="btn">אפס באזר</button>
        <button onClick={() => call('host_disqualify_current')} disabled={!locked} className="btn danger">פסול לחצן נוכחי</button>
        <button onClick={() => call('host_reveal_trivia')} className="btn gold">חשוף תשובה</button>
      </div>
      {locked && (
        <div className="flex items-center gap-3">
          <span>לחץ ראשון: <b style={{ color: locked.color }}>{locked.name}</b></span>
          <button onClick={() => call('host_award', { p_sector_id: locked.id, p_correct: true })} className="btn gold text-sm flex items-center gap-1.5"><IconCheck size={14} />נכון</button>
          <button onClick={() => call('host_award', { p_sector_id: locked.id, p_correct: false })} className="btn danger text-sm flex items-center gap-1.5"><IconX size={14} />שגוי</button>
        </div>
      )}
      <TimerRow />
    </section>
  );
}

function TrueFalseControls({ game, stories, onUsed }: any) {
  const unused = stories.filter((s: TrueFalseStory) => !s.used);
  return (
    <section className="host-card p-5 flex flex-col gap-3">
      <h2 className="font-bold text-[var(--gold)]">שלב קרה / לא קרה</h2>
      <div className="flex gap-2 flex-wrap items-center">
        <select
          className="bg-black/30 rounded-lg px-3 py-2 flex-1 min-w-[200px] border border-[#5367a9]"
          onChange={async (e) => { if (e.target.value) { await call('host_load_story', { p_story_id: e.target.value }); onUsed(); } }}
          value=""
        >
          <option value="">בחר סיפור ({unused.length} נותרו)...</option>
          {stories.map((s: TrueFalseStory) => (
            <option key={s.id} value={s.id} disabled={s.used}>{s.order_index}. {s.story.slice(0, 40)} {s.used ? '(נחשף)' : ''}</option>
          ))}
        </select>
        <button onClick={() => call('host_reveal_truefalse')} className="btn gold">חשוף תשובה + חשב ניקוד</button>
      </div>
      <p className="text-sm text-[var(--muted)]">הצביעו: {Object.keys(game.current_votes).length}/5</p>
      <TimerRow />
    </section>
  );
}

function SpeechControls({ game, words }: { game: any; words: SpeechWord[] }) {
  return (
    <section className="host-card p-5 flex flex-col gap-3">
      <h2 className="font-bold text-[var(--gold)]">שלב נאומי פרידה</h2>
      <div className="flex gap-2 flex-wrap">
        {words.map((w) => (
          <button
            key={w.id}
            onClick={() => call('host_set_speech_word', { p_index: w.order_index })}
            className={`btn text-sm ${game.current_word_index === w.order_index && game.current_word === w.word ? 'gold' : ''}`}
          >
            {w.order_index}. {w.word}
          </button>
        ))}
      </div>
      <TimerRow />
    </section>
  );
}

function TimerRow() {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm text-[var(--muted)]">טיימר:</span>
      {[15, 30, 60, 90].map((sec) => (
        <button key={sec} onClick={() => call('host_set_timer', { p_seconds: sec })} className="btn text-sm">{sec} שנ׳</button>
      ))}
      <button onClick={() => call('host_clear_timer')} className="btn text-sm">נקה</button>
    </div>
  );
}

function SectorsGrid({ sectors }: { sectors: any[] }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {sectors.map((s) => (
        <div key={s.id} className="host-card p-3" style={{ borderColor: s.color, borderWidth: 2 }}>
          <div className="flex items-center justify-between">
            <span className="font-black" style={{ color: s.color }}>{s.name}</span>
            <span className={`w-2.5 h-2.5 rounded-full ${s.connected ? 'bg-green-400' : 'bg-white/20'}`} />
          </div>
          <div className="text-sm text-[var(--muted)] truncate">{s.rep_name || 'לא הצטרף'}</div>
          <div className="text-2xl font-black mt-1">{s.score}</div>
          <div className="text-xs text-[var(--muted)]">נכון: {s.correct_count} · ראשון: {s.first_buzz_count}</div>
          <div className="flex gap-1 mt-2 flex-wrap">
            <button onClick={() => call('host_adjust_score', { p_sector_id: s.id, p_delta: 10 })} className="text-xs rounded-lg bg-white/10 px-2 py-1">+10</button>
            <button onClick={() => call('host_adjust_score', { p_sector_id: s.id, p_delta: -10 })} className="text-xs rounded-lg bg-white/10 px-2 py-1">-10</button>
            <button onClick={() => call('host_adjust_score', { p_sector_id: s.id, p_delta: 100 })} className="text-xs rounded-lg bg-white/10 px-2 py-1">+100</button>
            <button
              onClick={() => call('host_set_disqualified', { p_sector_id: s.id, p_disqualified: !s.disqualified })}
              className={`text-xs rounded-lg px-2 py-1 ${s.disqualified ? 'bg-red-600' : 'bg-white/10'}`}
            >
              {s.disqualified ? 'בטל פסילה' : 'פסול מהמשחק'}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

function ScoringSettings({ game }: { game: any }) {
  return (
    <section className="host-card p-4 flex gap-4 items-center flex-wrap">
      <h2 className="font-bold text-[var(--gold)] text-sm">שיטת ניקוד</h2>
      <label className="text-sm flex items-center gap-2">
        נכון:
        <input type="number" defaultValue={game.scoring_correct} onBlur={(e) => call('host_set_scoring', { p_correct: Number(e.target.value), p_wrong: game.scoring_wrong })} className="w-20 bg-black/30 rounded-lg px-2 py-1 border border-[#5367a9]" />
      </label>
      <label className="text-sm flex items-center gap-2">
        שגוי:
        <input type="number" defaultValue={game.scoring_wrong} onBlur={(e) => call('host_set_scoring', { p_correct: game.scoring_correct, p_wrong: Number(e.target.value) })} className="w-20 bg-black/30 rounded-lg px-2 py-1 border border-[#5367a9]" />
      </label>
    </section>
  );
}
