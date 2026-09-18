'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { HOST_KEY } from '@/lib/supabaseClient';
import { TriviaQuestion, TrueFalseStory, SpeechWord } from '@/lib/types';
import { IconX, IconPlus } from '@/lib/icons';

const headers = { 'x-host-key': HOST_KEY, 'Content-Type': 'application/json' };
const inputClass = 'bg-black/30 rounded-lg px-3 py-2 border border-[#5367a9] focus:border-[var(--gold)] outline-none';

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
        <Link href="/host" className="btn text-sm">חזרה למנחה</Link>
      </header>

      <QuestionsEditor questions={questions} reload={load} />
      <StoriesEditor stories={stories} reload={load} />
      <WordsEditor words={words} reload={load} />
    </main>
  );
}

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-bold text-[var(--gold)] text-lg">{title}</h2>
      <button onClick={onAdd} className="btn text-sm flex items-center gap-1.5"><IconPlus />{addLabel}</button>
    </div>
  );
}

function DeleteButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="self-start text-xs text-[#ffb5b9] flex items-center gap-1 hover:text-[#ee6d75]">
      <IconX size={13} />{label}
    </button>
  );
}

function QuestionsEditor({ questions, reload }: { questions: TriviaQuestion[]; reload: () => void }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={`שאלות טריוויה (${questions.length})`}
        addLabel="הוסף שאלה"
        onAdd={async () => {
          await api('POST', { table: 'questions', data: { order_index: questions.length + 1, question: 'שאלה חדשה', options: ['א', 'ב', 'ג', 'ד'], correct_index: 0 } });
          reload();
        }}
      />
      {questions.map((q) => (
        <div key={q.id} className="host-card p-4 flex flex-col gap-3">
          <input
            defaultValue={q.question}
            onBlur={(e) => api('PUT', { table: 'questions', id: q.id, data: { question: e.target.value } })}
            className={`${inputClass} font-bold`}
          />
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  style={{ accentColor: 'var(--gold)' }}
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
                  className={`${inputClass} flex-1 text-sm py-1.5`}
                />
              </div>
            ))}
          </div>
          <DeleteButton label="מחק שאלה" onClick={() => api('DELETE', undefined, `?table=questions&id=${q.id}`).then(reload)} />
        </div>
      ))}
    </section>
  );
}

function StoriesEditor({ stories, reload }: { stories: TrueFalseStory[]; reload: () => void }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={`סיפורי קרה/לא קרה (${stories.length})`}
        addLabel="הוסף סיפור"
        onAdd={async () => {
          await api('POST', { table: 'stories', data: { order_index: stories.length + 1, story: 'סיפור חדש', is_true: true } });
          reload();
        }}
      />
      {stories.map((s) => (
        <div key={s.id} className="host-card p-4 flex flex-col gap-3">
          <textarea
            defaultValue={s.story}
            onBlur={(e) => api('PUT', { table: 'stories', id: s.id, data: { story: e.target.value } })}
            className={inputClass}
            rows={2}
          />
          <label className="text-sm flex items-center gap-2 text-[var(--muted)]">
            <input type="checkbox" style={{ accentColor: 'var(--gold)' }} checked={s.is_true} onChange={(e) => api('PUT', { table: 'stories', id: s.id, data: { is_true: e.target.checked } }).then(reload)} />
            קרה באמת
          </label>
          <DeleteButton label="מחק סיפור" onClick={() => api('DELETE', undefined, `?table=stories&id=${s.id}`).then(reload)} />
        </div>
      ))}
    </section>
  );
}

function WordsEditor({ words, reload }: { words: SpeechWord[]; reload: () => void }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={`מילות מוקש לנאומים (${words.length})`}
        addLabel="הוסף מילה"
        onAdd={async () => {
          await api('POST', { table: 'words', data: { order_index: words.length + 1, word: 'מילה חדשה' } });
          reload();
        }}
      />
      <div className="flex flex-wrap gap-2">
        {words.map((w) => (
          <div key={w.id} className="host-card p-2 flex items-center gap-2">
            <input
              defaultValue={w.word}
              onBlur={(e) => api('PUT', { table: 'words', id: w.id, data: { word: e.target.value } })}
              className={`${inputClass} w-32 py-1.5`}
            />
            <button onClick={() => api('DELETE', undefined, `?table=words&id=${w.id}`).then(reload)} className="text-[#ffb5b9] hover:text-[#ee6d75]">
              <IconX size={13} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
