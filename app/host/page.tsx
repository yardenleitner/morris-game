'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { HOST_KEY } from '@/lib/config';
import { hostAction as call } from '@/lib/actions';
import { useLiveGame } from '@/lib/useLiveGame';
import { IconCheck, IconX, IconPlay } from '@/lib/icons';
import { ScoreBar, scoreScale } from '@/lib/ScoreBar';
import { Stage, TriviaQuestion, TrueFalseStory, SpeechWord } from '@/lib/types';

// Loading a question/story also opens the buzzer / starts the 15s timer and clears
// the previous reveal (see the host_load_* RPCs) — one call does the whole "next" step.
async function loadNextQuestion(questions: TriviaQuestion[], onUsed: () => void) {
  const next = [...questions].filter((q) => !q.used).sort((a, b) => a.order_index - b.order_index)[0];
  if (!next) return;
  await call('host_load_question', { p_question_id: next.id });
  onUsed();
}

async function loadNextStory(stories: TrueFalseStory[], onUsed: () => void) {
  const next = [...stories].filter((s) => !s.used).sort((a, b) => a.order_index - b.order_index)[0];
  if (!next) return;
  await call('host_load_story', { p_story_id: next.id });
  onUsed();
}

// speech_words has no "used" flag — it's inherently ordered, so "next" is just the
// smallest order_index past whatever word is currently showing.
async function loadNextWord(game: any, words: SpeechWord[]) {
  const next = [...words].filter((w) => w.order_index > (game.current_word_index || 0)).sort((a, b) => a.order_index - b.order_index)[0];
  if (!next) return;
  await call('host_set_speech_word', { p_index: next.order_index });
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
      {game.stage === 'rules' && <RulesStage questions={questions} onUsed={loadContent} />}
      {game.stage === 'trivia' && <TriviaControls game={game} questions={questions} stories={stories} sectors={sectors} onUsed={loadContent} />}
      {game.stage === 'truefalse' && <TrueFalseControls game={game} stories={stories} words={words} onUsed={loadContent} />}
      {game.stage === 'speech' && <SpeechControls game={game} words={words} />}
      {(game.stage === 'leaderboard' || game.stage === 'end') && <EndControls stage={game.stage} />}

      {(game.stage === 'trivia' || game.stage === 'truefalse' || game.stage === 'speech') && (
        <SectorsGrid sectors={sectors} />
      )}
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
          <button onClick={() => call('host_set_stage', { p_stage: 'rules' })} className="btn gold text-lg py-4 flex items-center justify-center gap-2">
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

function RulesStage({ questions, onUsed }: { questions: TriviaQuestion[]; onUsed: () => void }) {
  return (
    <section className="host-card p-8 flex flex-col items-center gap-4 text-center">
      <h2 className="text-xl font-bold text-[var(--gold)]">חוקי המשחק מוקרנים כרגע</h2>
      <p className="text-[var(--muted)] max-w-md">הקהל רואה את חוקי המשחק. כשמוכנים, התחילו את שאלת הטריוויה הראשונה — הבאזרים ייפתחו אוטומטית.</p>
      <button onClick={() => loadNextQuestion(questions, onUsed)} className="btn gold text-lg px-8 py-4">
        התחל טריוויה <IconPlay />
      </button>
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

// Trivia: the host's only real decisions are "who buzzed, were they right" and,
// once resolved, when to move on. Buzzer open/close, timers and manual question
// picking are all handled automatically now — nothing left for the host to fiddle with.
function TriviaControls({ game, questions, stories, sectors, onUsed }: any) {
  // current question's own order_index, not a count derived from `used` — `used` flips
  // the instant an answer is scored, before "Next Question" is clicked, which would
  // otherwise show the wrong number while still displaying that question's result.
  const currentQuestion = questions.find((q: TriviaQuestion) => q.id === game.current_question_id);
  const noMoreQuestions = questions.length > 0 && questions.every((q: TriviaQuestion) => q.used);
  const locked = sectors.find((s: any) => s.id === game.buzzer_locked_by);
  const revealed = game.revealed_correct_index !== null;
  const awardedSector = sectors.find((s: any) => s.id === game.winner_sector_id);

  const advance = () =>
    noMoreQuestions ? loadNextStory(stories, onUsed) : loadNextQuestion(questions, onUsed);

  return (
    <section className="host-card p-6 flex flex-col items-center gap-4 text-center">
      <h2 className="font-bold text-[var(--gold)]">שלב טריוויה · שאלה {currentQuestion?.order_index ?? '–'} מתוך {questions.length}</h2>

      {revealed ? (
        <>
          <span className={`text-lg font-bold ${game.last_award_correct ? 'text-green-400' : 'text-[var(--muted)]'}`}>
            {game.last_award_correct && awardedSector ? `${awardedSector.name} ענה/תה נכון!` : 'התשובה נחשפה'}
          </span>
          <button onClick={advance} className="btn gold text-lg px-6 py-3 flex items-center gap-1.5">
            {noMoreQuestions ? 'מעבר לשלב קרה / לא קרה' : 'השאלה הבאה'} <IconPlay />
          </button>
        </>
      ) : locked ? (
        <>
          <span className="text-lg">לחץ ראשון: <b style={{ color: locked.color }}>{locked.name}</b></span>
          <div className="flex gap-3">
            <button onClick={async () => { await call('host_award', { p_sector_id: locked.id, p_correct: true }); onUsed(); }} className="btn gold text-lg px-6 py-3 flex items-center gap-1.5"><IconCheck size={16} />נכון</button>
            <button onClick={() => call('host_award', { p_sector_id: locked.id, p_correct: false })} className="btn danger text-lg px-6 py-3 flex items-center gap-1.5"><IconX size={16} />שגוי</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[var(--muted)]">הבאזר פתוח — ממתינים ללחיצה...</p>
          <button onClick={async () => { await call('host_reveal_trivia'); onUsed(); }} className="text-sm text-[var(--muted)] underline hover:text-white">
            אף אחד לא ענה — דלג לשאלה הבאה
          </button>
        </>
      )}
    </section>
  );
}

// True/false: same idea — the host just reveals when ready and moves on. The 15s
// timer starts itself when the story loads and locks the phones automatically.
function TrueFalseControls({ game, stories, words, onUsed }: any) {
  const currentStory = stories.find((s: TrueFalseStory) => s.id === game.current_story_id);
  const noMoreStories = stories.length > 0 && stories.every((s: TrueFalseStory) => s.used);
  const revealed = game.revealed_is_true !== null;

  const advance = () =>
    noMoreStories ? loadNextWord(game, words) : loadNextStory(stories, onUsed);

  return (
    <section className="host-card p-6 flex flex-col items-center gap-4 text-center">
      <h2 className="font-bold text-[var(--gold)]">שלב קרה / לא קרה · סיפור {currentStory?.order_index ?? '–'} מתוך {stories.length}</h2>

      {revealed ? (
        <>
          <span className={`text-lg font-bold ${game.revealed_is_true ? 'text-green-400' : 'text-[#ff9d9d]'}`}>
            {game.revealed_is_true ? 'קרה!' : 'לא קרה!'}
          </span>
          <button onClick={advance} className="btn gold text-lg px-6 py-3 flex items-center gap-1.5">
            {noMoreStories ? 'מעבר לשלב נאומי הפרידה' : 'הסיפור הבא'} <IconPlay />
          </button>
        </>
      ) : (
        <>
          <p className="text-[var(--muted)]">הצביעו: {Object.keys(game.current_votes).length}/5</p>
          <button onClick={async () => { await call('host_reveal_truefalse'); onUsed(); }} className="btn gold text-lg px-6 py-3">
            חשוף תשובה
          </button>
        </>
      )}
    </section>
  );
}

function SpeechControls({ game, words }: { game: any; words: SpeechWord[] }) {
  const maxIndex = Math.max(0, ...words.map((w) => w.order_index));
  const isLastWord = words.length > 0 && game.current_word_index >= maxIndex;

  return (
    <section className="host-card p-6 flex flex-col items-center gap-4 text-center">
      <h2 className="font-bold text-[var(--gold)]">שלב נאומי פרידה · מילה {game.current_word_index} מתוך {words.length}</h2>
      {isLastWord ? (
        <button onClick={() => call('host_set_stage', { p_stage: 'leaderboard' })} className="btn gold text-lg px-6 py-3 flex items-center gap-1.5">
          הצג טבלת מובילים <IconPlay />
        </button>
      ) : (
        <button onClick={() => loadNextWord(game, words)} className="btn gold text-lg px-6 py-3 flex items-center gap-1.5">
          המילה הבאה <IconPlay />
        </button>
      )}
    </section>
  );
}

// Read-only standings — no per-sector controls; scoring is fully automatic now.
function SectorsGrid({ sectors }: { sectors: any[] }) {
  const max = scoreScale(sectors.map((s) => s.score));
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {sectors.map((s) => (
        <div key={s.id} className="host-card p-3" style={{ borderColor: s.color, borderWidth: 2 }}>
          <div className="flex items-center justify-between">
            <span className="font-black" style={{ color: s.color }}>{s.name}</span>
            <span className={`w-2.5 h-2.5 rounded-full ${s.connected ? 'bg-green-400' : 'bg-white/20'}`} />
          </div>
          <div className="text-sm text-[var(--muted)] truncate">{s.rep_name || 'לא הצטרף'}</div>
          <div className="mt-2"><ScoreBar value={s.score} max={max} color={s.color} /></div>
          <div className="text-2xl font-black mt-1">{s.score}</div>
        </div>
      ))}
    </section>
  );
}
