'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { HOST_KEY } from '@/lib/supabaseClient';
import { TriviaQuestion, TrueFalseStory, SpeechWord } from '@/lib/types';

const headers = { 'x-host-key': HOST_KEY, 'Content-Type': 'application/json' };

async function api(method: string, body?: any, qs?: string) {
  const res = await fetch(`/api/content${qs ?? ''}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return res.json();
}

export default function ContentPage() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [stories, setStories] = useState<TrueFalseStory[]>([]);
  const [words, setWords] = useState<SpeechWord[]>([]);

  const load = useCallback(async () => {
    const [q, s, w] = await Promise.all([
      api('GET', undefined, '?table=questions'),
      api('GET', undefined, '?table=stories'),
      api('GET', undefined, '?table=words'),
    ]);
    setQuestions(q.data ?? []);
    setStories(s.data ?? []);
    setWords(w.data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="flex-1 p-4 md:p-6 flex flex-col gap-8 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black gold-text">עריכת תוכן</h1>
        <Link href="/host" className="rounded-lg bg-[var(--panel)] border border-white/10 px-3 py-2 text-sm">חזרה למנחה</Link>
      </header>

      <QuestionsEditor questions={questions} reload={load} />
      <StoriesEditor stories={stories} reload={load} />
      <WordsEditor words={words} reload={load} />
    </main>
  );
}

function QuestionsEditor({ questions, reload }: { questions: TriviaQuestion[]; reload: () => void }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[var(--gold)]">שאלות טריוויה ({questions.length})</h2>
        <button
          onClick={async () => {
            await api('POST', { table: 'questions', data: { order_index: questions.length + 1, question: 'שאלה חדשה', options: ['א', 'ב', 'ג', 'ד'], correct_index: 0 } });
            reload();
          }}
          className="rounded bg-white/10 px-3 py-1 text-sm"
        >
          + הוסף שאלה
        </button>
      </div>
      {questions.map((q) => (
        <div key={q.id} className="rounded-xl bg-[var(--panel)] border border-white/10 p-3 flex flex-col gap-2">
          <input
            defaultValue={q.question}
            onBlur={(e) => api('PUT', { table: 'questions', id: q.id, data: { question: e.target.value } })}
            className="bg-black/30 rounded px-3 py-2 font-bold"
          />
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={q.correct_index === i}
                  onChange={() => api('PUT', { table: 'questions', id: q.id, data: { correct_index: i } }).then(reload)}
                />
                <input
                  defaultValue={opt}
                  onBlur={(e) => {
                    const newOpts = [...q.options];
                    newOpts[i] = e.target.value;
                    api('PUT', { table: 'questions', id: q.id, data: { options: newOpts } });
                  }}
                  className="bg-black/20 rounded px-2 py-1 flex-1 text-sm"
                />
              </div>
            ))}
          </div>
          <button onClick={() => api('DELETE', undefined, `?table=questions&id=${q.id}`).then(reload)} className="self-start text-xs text-red-400">מחק</button>
        </div>
      ))}
    </section>
  );
}

function StoriesEditor({ stories, reload }: { stories: TrueFalseStory[]; reload: () => void }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[var(--gold)]">סיפורי קרה/לא קרה ({stories.length})</h2>
        <button
          onClick={async () => {
            await api('POST', { table: 'stories', data: { order_index: stories.length + 1, story: 'סיפור חדש', is_true: true } });
            reload();
          }}
          className="rounded bg-white/10 px-3 py-1 text-sm"
        >
          + הוסף סיפור
        </button>
      </div>
      {stories.map((s) => (
        <div key={s.id} className="rounded-xl bg-[var(--panel)] border border-white/10 p-3 flex flex-col gap-2">
          <textarea
            defaultValue={s.story}
            onBlur={(e) => api('PUT', { table: 'stories', id: s.id, data: { story: e.target.value } })}
            className="bg-black/30 rounded px-3 py-2"
            rows={2}
          />
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={s.is_true} onChange={(e) => api('PUT', { table: 'stories', id: s.id, data: { is_true: e.target.checked } }).then(reload)} />
            קרה באמת
          </label>
          <button onClick={() => api('DELETE', undefined, `?table=stories&id=${s.id}`).then(reload)} className="self-start text-xs text-red-400">מחק</button>
        </div>
      ))}
    </section>
  );
}

function WordsEditor({ words, reload }: { words: SpeechWord[]; reload: () => void }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[var(--gold)]">מילות מוקש לנאומים ({words.length})</h2>
        <button
          onClick={async () => {
            await api('POST', { table: 'words', data: { order_index: words.length + 1, word: 'מילה חדשה' } });
            reload();
          }}
          className="rounded bg-white/10 px-3 py-1 text-sm"
        >
          + הוסף מילה
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {words.map((w) => (
          <div key={w.id} className="rounded-lg bg-[var(--panel)] border border-white/10 p-2 flex items-center gap-2">
            <input
              defaultValue={w.word}
              onBlur={(e) => api('PUT', { table: 'words', id: w.id, data: { word: e.target.value } })}
              className="bg-black/30 rounded px-2 py-1 w-32"
            />
            <button onClick={() => api('DELETE', undefined, `?table=words&id=${w.id}`).then(reload)} className="text-xs text-red-400">✕</button>
          </div>
        ))}
      </div>
    </section>
  );
}
