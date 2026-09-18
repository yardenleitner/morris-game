'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, HOST_KEY } from '@/lib/supabaseClient';
import { useLiveGame } from '@/lib/useLiveGame';
import { Stage, TriviaQuestion, TrueFalseStory, SpeechWord, SectorId } from '@/lib/types';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'lobby', label: 'לובי' },
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

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  if (loading || !game) return <main className="flex-1 flex items-center justify-center">טוען...</main>;

  return (
    <main className="flex-1 p-4 md:p-6 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-black gold-text">מסך מנחה — מי מכיר את מוריס?</h1>
        <div className="flex gap-2">
          <Link href="/host/content" className="rounded-lg bg-[var(--panel)] border border-white/10 px-3 py-2 text-sm">עריכת תוכן</Link>
          <Link href="/screen" target="_blank" className="rounded-lg bg-[var(--panel)] border border-white/10 px-3 py-2 text-sm">מסך הקרנה ↗</Link>
          <button
            onClick={() => confirm('לאפס את כל המשחק? הניקוד והמצב יימחקו.') && call('host_reset_game')}
            className="rounded-lg bg-red-900/60 border border-red-500/40 px-3 py-2 text-sm"
          >
            איפוס משחק
          </button>
        </div>
      </header>

      {/* stage selector */}
      <section className="flex gap-2 flex-wrap">
        {STAGES.map((s) => (
          <button
            key={s.id}
            onClick={() => call('host_set_stage', { p_stage: s.id })}
            className={`rounded-lg px-4 py-2 font-bold border ${
              game.stage === s.id ? 'bg-[var(--gold)] text-[#1a1330] border-[var(--gold)]' : 'bg-[var(--panel)] border-white/10'
            }`}
          >
            {s.label}
          </button>
        ))}
      </section>

      {/* sectors live status */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {sectors.map((s) => (
          <div key={s.id} className="rounded-xl bg-[var(--panel)] border-2 p-3" style={{ borderColor: s.color }}>
            <div className="flex items-center justify-between">
              <span className="font-black" style={{ color: s.color }}>{s.name}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${s.connected ? 'bg-green-400' : 'bg-white/20'}`} />
            </div>
            <div className="text-sm text-[var(--muted)] truncate">{s.rep_name || 'לא הצטרף'}</div>
            <div className="text-2xl font-black mt-1">{s.score}</div>
            <div className="text-xs text-[var(--muted)]">נכון: {s.correct_count} · ראשון: {s.first_buzz_count}</div>
            <div className="flex gap-1 mt-2 flex-wrap">
              <button onClick={() => call('host_adjust_score', { p_sector_id: s.id, p_delta: 10 })} className="text-xs rounded bg-white/10 px-2 py-1">+10</button>
              <button onClick={() => call('host_adjust_score', { p_sector_id: s.id, p_delta: -10 })} className="text-xs rounded bg-white/10 px-2 py-1">-10</button>
              <button onClick={() => call('host_adjust_score', { p_sector_id: s.id, p_delta: 100 })} className="text-xs rounded bg-white/10 px-2 py-1">+100</button>
              <button
                onClick={() => call('host_set_disqualified', { p_sector_id: s.id, p_disqualified: !s.disqualified })}
                className={`text-xs rounded px-2 py-1 ${s.disqualified ? 'bg-red-600' : 'bg-white/10'}`}
              >
                {s.disqualified ? 'בטל פסילה' : 'פסול מהמשחק'}
              </button>
            </div>
          </div>
        ))}
      </section>

      {game.stage === 'trivia' && (
        <TriviaControls game={game} questions={questions} sectors={sectors} onUsed={loadContent} />
      )}
      {game.stage === 'truefalse' && (
        <TrueFalseControls game={game} stories={stories} onUsed={loadContent} />
      )}
      {game.stage === 'speech' && <SpeechControls game={game} words={words} />}

      <ScoringSettings game={game} />
    </main>
  );
}

function TriviaControls({ game, questions, sectors, onUsed }: any) {
  const unused = questions.filter((q: TriviaQuestion) => !q.used);
  const locked = sectors.find((s: any) => s.id === game.buzzer_locked_by);
  return (
    <section className="rounded-xl bg-[var(--panel)] border border-white/10 p-4 flex flex-col gap-3">
      <h2 className="font-bold text-[var(--gold)]">שלב טריוויה</h2>
      <div className="flex gap-2 flex-wrap items-center">
        <select
          className="bg-black/30 rounded px-3 py-2 flex-1 min-w-[200px]"
          onChange={async (e) => { if (e.target.value) { await call('host_load_question', { p_question_id: e.target.value }); onUsed(); } }}
          value=""
        >
          <option value="">בחר שאלה ({unused.length} נותרו)...</option>
          {questions.map((q: TriviaQuestion) => (
            <option key={q.id} value={q.id} disabled={q.used}>{q.order_index}. {q.question} {q.used ? '(נענתה)' : ''}</option>
          ))}
        </select>
        <button onClick={() => call('host_open_buzzer')} className="rounded-lg bg-green-600 px-4 py-2 font-bold">פתח באזר</button>
        <button onClick={() => call('host_close_buzzer')} className="rounded-lg bg-white/10 px-4 py-2 font-bold">סגור באזר</button>
        <button onClick={() => call('host_new_round')} className="rounded-lg bg-white/10 px-4 py-2 font-bold">אפס באזר</button>
        <button onClick={() => call('host_disqualify_current')} disabled={!locked} className="rounded-lg bg-red-900/60 px-4 py-2 font-bold disabled:opacity-30">פסול לחצן נוכחי</button>
        <button onClick={() => call('host_reveal_trivia')} className="rounded-lg bg-[var(--gold)] text-[#1a1330] px-4 py-2 font-bold">חשוף תשובה</button>
      </div>
      {locked && (
        <div className="flex items-center gap-3">
          <span>לחץ ראשון: <b style={{ color: locked.color }}>{locked.name}</b></span>
          <button onClick={() => call('host_award', { p_sector_id: locked.id, p_correct: true })} className="rounded bg-green-600 px-3 py-1 text-sm">נכון</button>
          <button onClick={() => call('host_award', { p_sector_id: locked.id, p_correct: false })} className="rounded bg-red-600 px-3 py-1 text-sm">שגוי</button>
        </div>
      )}
      <TimerRow />
    </section>
  );
}

function TrueFalseControls({ game, stories, onUsed }: any) {
  const unused = stories.filter((s: TrueFalseStory) => !s.used);
  return (
    <section className="rounded-xl bg-[var(--panel)] border border-white/10 p-4 flex flex-col gap-3">
      <h2 className="font-bold text-[var(--gold)]">שלב קרה / לא קרה</h2>
      <div className="flex gap-2 flex-wrap items-center">
        <select
          className="bg-black/30 rounded px-3 py-2 flex-1 min-w-[200px]"
          onChange={async (e) => { if (e.target.value) { await call('host_load_story', { p_story_id: e.target.value }); onUsed(); } }}
          value=""
        >
          <option value="">בחר סיפור ({unused.length} נותרו)...</option>
          {stories.map((s: TrueFalseStory) => (
            <option key={s.id} value={s.id} disabled={s.used}>{s.order_index}. {s.story.slice(0, 40)} {s.used ? '(נחשף)' : ''}</option>
          ))}
        </select>
        <button onClick={() => call('host_reveal_truefalse')} className="rounded-lg bg-[var(--gold)] text-[#1a1330] px-4 py-2 font-bold">חשוף תשובה + חשב ניקוד</button>
      </div>
      <p className="text-sm text-[var(--muted)]">הצביעו: {Object.keys(game.current_votes).length}/5</p>
      <TimerRow />
    </section>
  );
}

function SpeechControls({ game, words }: { game: any; words: SpeechWord[] }) {
  return (
    <section className="rounded-xl bg-[var(--panel)] border border-white/10 p-4 flex flex-col gap-3">
      <h2 className="font-bold text-[var(--gold)]">שלב נאומי פרידה</h2>
      <div className="flex gap-2 flex-wrap">
        {words.map((w) => (
          <button
            key={w.id}
            onClick={() => call('host_set_speech_word', { p_index: w.order_index })}
            className={`rounded-lg px-3 py-2 border ${game.current_word_index === w.order_index && game.current_word === w.word ? 'bg-[var(--gold)] text-[#1a1330] border-[var(--gold)]' : 'bg-black/30 border-white/10'}`}
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
        <button key={sec} onClick={() => call('host_set_timer', { p_seconds: sec })} className="rounded bg-white/10 px-3 py-1 text-sm">{sec} שנ׳</button>
      ))}
      <button onClick={() => call('host_clear_timer')} className="rounded bg-white/10 px-3 py-1 text-sm">נקה</button>
    </div>
  );
}

function ScoringSettings({ game }: { game: any }) {
  return (
    <section className="rounded-xl bg-[var(--panel)] border border-white/10 p-4 flex gap-4 items-center flex-wrap">
      <h2 className="font-bold text-[var(--gold)]">שיטת ניקוד</h2>
      <label className="text-sm flex items-center gap-2">
        נכון:
        <input
          type="number"
          defaultValue={game.scoring_correct}
          onBlur={(e) => call('host_set_scoring', { p_correct: Number(e.target.value), p_wrong: game.scoring_wrong })}
          className="w-20 bg-black/30 rounded px-2 py-1"
        />
      </label>
      <label className="text-sm flex items-center gap-2">
        שגוי:
        <input
          type="number"
          defaultValue={game.scoring_wrong}
          onBlur={(e) => call('host_set_scoring', { p_correct: game.scoring_correct, p_wrong: Number(e.target.value) })}
          className="w-20 bg-black/30 rounded px-2 py-1"
        />
      </label>
    </section>
  );
}
