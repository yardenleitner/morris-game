'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { HOST_KEY } from '@/lib/config';
import { hostAction as call } from '@/lib/actions';
import { useLiveGame } from '@/lib/useLiveGame';
import { IconCheck, IconX, IconPlay } from '@/lib/icons';
import { ScoreBar, scoreScale } from '@/lib/ScoreBar';
import { GameState, Stage, TriviaQuestion, TrueFalseStory, SpeechWord, SPEECH_ORDER, speakerForWordIndex } from '@/lib/types';

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
// smallest order_index past whatever word is currently showing. The round stops at
// SPEECH_ORDER.length: one speech per sector, however many words the table holds.
async function loadNextWord(game: any, words: SpeechWord[]) {
  const next = [...words]
    .filter((w) => w.order_index > (game.current_word_index || 0) && w.order_index <= SPEECH_ORDER.length)
    .sort((a, b) => a.order_index - b.order_index)[0];
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
      {game.stage === 'rules' && (
        <RulesStage game={game} questions={questions} stories={stories} words={words} onUsed={loadContent} />
      )}
      {game.stage === 'trivia' && <TriviaControls game={game} questions={questions} sectors={sectors} onUsed={loadContent} />}
      {game.stage === 'truefalse' && <TrueFalseControls game={game} stories={stories} onUsed={loadContent} />}
      {game.stage === 'speech' && <SpeechControls game={game} words={words} sectors={sectors} />}
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
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(`${window.location.origin}/play`); }, []);
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="host-card p-6 flex flex-col items-center text-center gap-3">
        <h2 className="text-lg font-bold text-[var(--gold)]">שלב רישום נציגים</h2>
        <p className="text-[var(--muted)] text-sm">הראו את הקוד הזה לנציגים כדי שיצטרפו מהטלפון.</p>
        {url && (
          <div className="bg-white p-3 rounded-2xl shadow-2xl">
            <QRCodeSVG value={url} size={170} />
          </div>
        )}
        <div className="mt-auto pt-4 w-full flex flex-col gap-3">
          <button
            onClick={() => call('host_show_rules', { p_for: 'trivia' })}
            className="btn gold text-lg py-4 flex items-center justify-center gap-2"
          >
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

// Fires before every round now (trivia / truefalse / speech), not just once at
// the top of the show — game.rules_for says which round is coming, so this picks
// the right blurb and the right "start" call.
const RULES_STAGE_COPY: Record<'trivia' | 'truefalse' | 'speech', { blurb: string; cta: string }> = {
  trivia: { blurb: 'הקהל רואה את חוקי סבב הטריוויה. כשמוכנים, התחילו את השאלה הראשונה — הבאזרים ייפתחו אוטומטית.', cta: 'התחל טריוויה' },
  truefalse: { blurb: 'הקהל רואה את חוקי סבב קרה / לא קרה. כשמוכנים, התחילו את הסיפור הראשון.', cta: 'התחל קרה / לא קרה' },
  speech: { blurb: 'הקהל רואה את חוקי שלב נאומי הפרידה. כשמוכנים, התחילו את הנואם/ת הראשון/ה.', cta: 'התחל נאומי פרידה' },
};

function RulesStage({
  game, questions, stories, words, onUsed,
}: {
  game: GameState; questions: TriviaQuestion[]; stories: TrueFalseStory[]; words: SpeechWord[]; onUsed: () => void;
}) {
  const forStage = game.rules_for ?? 'trivia';
  const copy = RULES_STAGE_COPY[forStage];

  const start = () => {
    if (forStage === 'trivia') return loadNextQuestion(questions, onUsed);
    if (forStage === 'truefalse') return loadNextStory(stories, onUsed);
    return loadNextWord(game, words);
  };

  return (
    <section className="host-card p-8 flex flex-col items-center gap-4 text-center">
      <h2 className="text-xl font-bold text-[var(--gold)]">חוקי המשחק מוקרנים כרגע</h2>
      <p className="text-[var(--muted)] max-w-md">{copy.blurb}</p>
      <button onClick={start} className="btn gold text-lg px-8 py-4">
        {copy.cta} <IconPlay />
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
function TriviaControls({ game, questions, sectors, onUsed }: any) {
  // current question's own order_index, not a count derived from `used` — `used` flips
  // the instant an answer is scored, before "Next Question" is clicked, which would
  // otherwise show the wrong number while still displaying that question's result.
  const currentQuestion = questions.find((q: TriviaQuestion) => q.id === game.current_question_id);
  const noMoreQuestions = questions.length > 0 && questions.every((q: TriviaQuestion) => q.used);
  const locked = sectors.find((s: any) => s.id === game.buzzer_locked_by);
  const revealed = game.revealed_correct_index !== null;
  const awardedSector = sectors.find((s: any) => s.id === game.winner_sector_id);

  const advance = () =>
    noMoreQuestions ? call('host_show_rules', { p_for: 'truefalse' }) : loadNextQuestion(questions, onUsed);

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
function TrueFalseControls({ game, stories, onUsed }: any) {
  const currentStory = stories.find((s: TrueFalseStory) => s.id === game.current_story_id);
  const noMoreStories = stories.length > 0 && stories.every((s: TrueFalseStory) => s.used);
  const revealed = game.revealed_is_true !== null;

  const advance = () =>
    noMoreStories ? call('host_show_rules', { p_for: 'speech' }) : loadNextStory(stories, onUsed);

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

// One speech per sector in SPEECH_ORDER. The host judges each one, worth three
// points either way, and only then moves on -- so a speaker cannot be skipped
// unscored, and "who is up" is answered by position rather than by memory.
function SpeechControls({ game, words, sectors }: { game: any; words: SpeechWord[]; sectors: any[] }) {
  const total = SPEECH_ORDER.length;
  const speakerId = speakerForWordIndex(game.current_word_index);
  const speaker = sectors.find((s) => s.id === speakerId);
  const judged = game.speech_result !== null;
  const isLastSpeaker = game.current_word_index >= total;
  const word = words.find((w) => w.order_index === game.current_word_index);

  return (
    <section className="host-card p-6 flex flex-col items-center gap-4 text-center">
      <h2 className="font-bold text-[var(--gold)]">
        שלב נאומי פרידה · נואם/ת {Math.min(game.current_word_index, total)} מתוך {total}
      </h2>

      {speaker ? (
        <>
          <div className="text-lg">
            נואם/ת: <b style={{ color: speaker.color }}>{speaker.name}</b>
            {word && <> · מילת מוקש: <b className="text-[var(--gold)]">{word.word}</b></>}
          </div>

          {judged ? (
            <>
              <span className={`text-lg font-bold ${game.speech_result ? 'text-green-400' : 'text-[#ff9d9d]'}`}>
                {game.speech_result ? `${speaker.name} הצליח/ה! +3` : `${speaker.name} לא הצליח/ה · -3`}
              </span>
              {isLastSpeaker ? (
                <button onClick={() => call('host_set_stage', { p_stage: 'leaderboard' })} className="btn gold text-lg px-6 py-3 flex items-center gap-1.5">
                  הצג טבלת מובילים <IconPlay />
                </button>
              ) : (
                <button onClick={() => loadNextWord(game, words)} className="btn gold text-lg px-6 py-3 flex items-center gap-1.5">
                  הנואם/ת הבא/ה <IconPlay />
                </button>
              )}
            </>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => call('host_award_speech', { p_sector_id: speaker.id, p_success: true })}
                className="btn gold text-lg px-6 py-3 flex items-center gap-1.5"
              >
                <IconCheck size={16} />שילב/ה את המילה (+3)
              </button>
              <button
                onClick={() => call('host_award_speech', { p_sector_id: speaker.id, p_success: false })}
                className="btn danger text-lg px-6 py-3 flex items-center gap-1.5"
              >
                <IconX size={16} />לא שילב/ה (-3)
              </button>
            </div>
          )}
        </>
      ) : (
        <button onClick={() => loadNextWord(game, words)} className="btn gold text-lg px-6 py-3 flex items-center gap-1.5">
          התחל את הנואם/ת הראשון/ה <IconPlay />
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
