'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLiveGame } from '@/lib/useLiveGame';
import { SectorId, SECTOR_IDS } from '@/lib/types';

const STORAGE_KEY = 'morris-sector';

export default function PlayPage() {
  const { game, sectors, loading } = useLiveGame();
  const [mySector, setMySector] = useState<SectorId | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [pickedSector, setPickedSector] = useState<SectorId | null>(null);
  const [joining, setJoining] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMySector(saved as SectorId);
  }, []);

  useEffect(() => {
    setVoted(false);
  }, [game?.round_id]);

  if (loading || !game) {
    return <Centered>טוען...</Centered>;
  }

  const me = sectors.find((s) => s.id === mySector);

  if (!mySector || !me) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-3xl font-black gold-text">מי מכיר את מוריס?</h1>
        <p className="text-[var(--muted)]">בחר/י את המדור שלך</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {SECTOR_IDS.map((id) => {
            const s = sectors.find((x) => x.id === id);
            return (
              <button
                key={id}
                onClick={() => setPickedSector(id)}
                style={{ borderColor: s?.color, background: pickedSector === id ? s?.color : 'transparent' }}
                className="rounded-xl border-2 py-6 text-xl font-bold transition-colors"
              >
                {s?.name ?? id}
              </button>
            );
          })}
        </div>
        {pickedSector && (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="השם שלך"
              className="rounded-xl bg-[var(--panel)] border border-white/10 px-4 py-3 text-center text-lg"
            />
            <button
              disabled={!nameInput.trim() || joining}
              onClick={async () => {
                setJoining(true);
                await supabase.rpc('join_sector', { p_sector_id: pickedSector, p_name: nameInput.trim() });
                localStorage.setItem(STORAGE_KEY, pickedSector);
                setMySector(pickedSector);
                setJoining(false);
              }}
              className="rounded-xl bg-gradient-to-l from-[var(--gold)] to-[var(--orange)] text-[#1a1330] font-black py-4 text-lg disabled:opacity-40"
            >
              {joining ? 'מצטרף...' : 'הצטרף למשחק'}
            </button>
          </div>
        )}
      </main>
    );
  }

  const iAmLocked = game.buzzer_locked_by === mySector;
  const otherLocked = game.buzzer_locked_by && game.buzzer_locked_by !== mySector;
  const lockedSectorName = otherLocked ? sectors.find((s) => s.id === game.buzzer_locked_by)?.name : null;
  const excluded = game.round_excluded.includes(mySector);
  const canBuzz = game.stage === 'trivia' && game.buzzer_open && !game.buzzer_locked_by && !excluded && !me.disqualified;

  const alreadyVoted = game.current_votes[mySector] !== undefined;

  return (
    <main className="flex-1 flex flex-col items-center gap-6 p-5 text-center" style={{ boxShadow: `inset 0 8px 0 ${me.color}` }}>
      <header className="w-full flex items-center justify-between pt-2">
        <div className="text-right">
          <div className="font-black text-lg" style={{ color: me.color }}>{me.name}</div>
          <div className="text-sm text-[var(--muted)]">{me.rep_name}</div>
        </div>
        <div className="text-left">
          <div className="text-2xl font-black gold-text">{me.score}</div>
          <div className="text-xs text-[var(--muted)]">נקודות</div>
        </div>
      </header>

      {me.disqualified && (
        <BigMsg color="#e8452c">הופסקת מהמשחק ע״י המנחה</BigMsg>
      )}

      {!me.disqualified && game.stage === 'lobby' && (
        <BigMsg color="var(--muted)">ממתינים למנחה שיתחיל את המשחק...</BigMsg>
      )}

      {!me.disqualified && game.stage === 'trivia' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
          {iAmLocked && <BigMsg color="var(--gold)">אתה ראשון — ענה עכשיו!</BigMsg>}
          {otherLocked && <BigMsg color="var(--muted)">{lockedSectorName} לחץ ראשון</BigMsg>}
          {!game.buzzer_open && !game.buzzer_locked_by && (
            <p className="text-[var(--muted)] text-lg">הבאזר סגור — המתן/י למנחה</p>
          )}
          {excluded && !game.buzzer_locked_by && (
            <p className="text-[var(--muted)] text-lg">נפסלת בסיבוב הזה — המתן/י לשאלה הבאה</p>
          )}
          <button
            disabled={!canBuzz || pressing}
            onClick={async () => {
              setPressing(true);
              await supabase.rpc('press_buzzer', { p_sector_id: mySector, p_round_id: game.round_id });
              setPressing(false);
            }}
            className={`w-56 h-56 rounded-full font-black text-3xl shadow-2xl transition-all ${
              canBuzz ? 'buzz-open' : 'opacity-30'
            }`}
            style={{ background: canBuzz ? `radial-gradient(circle at 35% 30%, ${me.color}, #000)` : '#333' }}
          >
            באזר
          </button>
        </div>
      )}

      {!me.disqualified && game.stage === 'truefalse' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
          <p className="text-xl leading-relaxed">{game.current_story_text}</p>
          {alreadyVoted || voted ? (
            <p className="text-[var(--gold)] text-lg font-bold">ההצבעה נשלחה — ממתינים לשאר המדורים</p>
          ) : (
            <div className="flex gap-4 w-full">
              <button
                onClick={async () => {
                  setVoted(true);
                  await supabase.rpc('submit_vote', { p_sector_id: mySector, p_round_id: game.round_id, p_vote: true });
                }}
                className="flex-1 rounded-2xl bg-green-600 py-8 text-2xl font-black"
              >
                קרה
              </button>
              <button
                onClick={async () => {
                  setVoted(true);
                  await supabase.rpc('submit_vote', { p_sector_id: mySector, p_round_id: game.round_id, p_vote: false });
                }}
                className="flex-1 rounded-2xl bg-red-600 py-8 text-2xl font-black"
              >
                לא קרה
              </button>
            </div>
          )}
        </div>
      )}

      {!me.disqualified && game.stage === 'speech' && (
        <BigMsg color="var(--gold)">שלב נאומי הפרידה — עקבו אחרי המסך הגדול</BigMsg>
      )}

      {!me.disqualified && (game.stage === 'leaderboard' || game.stage === 'end') && (
        <BigMsg color="var(--gold)">תודה שלקחת חלק! עקבו אחרי לוח המובילים על המסך</BigMsg>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 flex items-center justify-center text-[var(--muted)] text-lg">{children}</main>;
}

function BigMsg({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="pop-in text-2xl font-black" style={{ color }}>
      {children}
    </div>
  );
}
