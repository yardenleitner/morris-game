'use client';
import { useEffect, useState } from 'react';
import { playerAction } from '@/lib/actions';
import { useLiveGame } from '@/lib/useLiveGame';
import { IconClock } from '@/lib/icons';
import { SectorId, SECTOR_IDS } from '@/lib/types';

const STORAGE_KEY = 'morris-sector';

// ticks down against timer_ends_at so the true/false vote buttons can lock at 0,
// even if the host hasn't clicked reveal yet.
function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}

export default function PlayPage() {
  const { game, sectors, loading } = useLiveGame();
  const [mySector, setMySector] = useState<SectorId | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [pickedSector, setPickedSector] = useState<SectorId | null>(null);
  const [joining, setJoining] = useState(false);
  const [voted, setVoted] = useState(false);
  const voteRemaining = useCountdown(game && game.stage === 'truefalse' ? game.timer_ends_at : null);

  const [storageChecked, setStorageChecked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMySector(saved as SectorId);
    else setStorageChecked(true); // nothing to verify
  }, []);

  // a sector id restored from localStorage doesn't mean the server actually has us
  // connected — e.g. after a host reset, or a stale value left over from another
  // session on this browser. Verify it once against real data before trusting it;
  // otherwise it silently shows a "joined" screen for a sector we were never added to.
  // Runs only until the first real sectors snapshot arrives, so it never re-fires and
  // fights a fresh join (whose setMySector call doesn't go through this check at all).
  useEffect(() => {
    if (storageChecked || loading || !mySector) return;
    const me = sectors.find((s) => s.id === mySector);
    if (!me?.connected) {
      localStorage.removeItem(STORAGE_KEY);
      setMySector(null);
    }
    setStorageChecked(true);
  }, [storageChecked, loading, mySector, sectors]);

  useEffect(() => { setVoted(false); }, [game?.round_id]);

  if (loading || !game) return <Centered>טוען...</Centered>;

  const me = sectors.find((s) => s.id === mySector);

  if (!mySector || !me) {
    return (
      <main className="flex-1 flex flex-col p-6 gap-5">
        <div className="text-center pt-4">
          <div className="text-xs font-extrabold text-[var(--gold)] tracking-widest">מי מכיר</div>
          <div className="text-2xl font-black text-[var(--gold)] -mt-0.5">מוריס?</div>
        </div>
        <p className="text-[var(--muted)] text-center">בחר/י את המדור שלך</p>
        <div className="grid grid-cols-2 gap-3">
          {SECTOR_IDS.map((id) => {
            const s = sectors.find((x) => x.id === id);
            const picked = pickedSector === id;
            return (
              <button
                key={id}
                onClick={() => setPickedSector(id)}
                style={{ borderColor: s?.color, background: picked ? s?.color : 'transparent', color: picked ? '#fff' : s?.color }}
                className="rounded-2xl border-2 py-7 text-xl font-extrabold transition-colors"
              >
                {s?.name ?? id}
              </button>
            );
          })}
        </div>
        {pickedSector && (
          <div className="flex flex-col gap-3 mt-1 pop-in">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="השם שלך"
              className="rounded-xl bg-[#0c1642] border border-[#5367a9] px-4 py-3.5 text-center text-lg"
            />
            <button
              disabled={!nameInput.trim() || joining}
              onClick={async () => {
                setJoining(true);
                try {
                  await playerAction('join_sector', { p_sector_id: pickedSector, p_name: nameInput.trim() });
                } catch (e) {
                  setJoining(false);
                  alert(`ההצטרפות נכשלה, נסו שוב (${e instanceof Error ? e.message : e})`);
                  return;
                }
                setJoining(false);
                localStorage.setItem(STORAGE_KEY, pickedSector);
                setMySector(pickedSector);
              }}
              className="btn gold py-4 text-lg disabled:opacity-40"
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
  // Deliberately NOT a gate on the button. The phone never decides whether a press
  // counts — press_buzzer on the server does — so this only drives how the button
  // looks: lit while the round is still there to win, calm once it is gone.
  const liveRound = game.buzzer_open && !game.buzzer_locked_by && !excluded;
  const alreadyVoted = game.current_votes[mySector] !== undefined;
  const voteTimeUp = voteRemaining === 0;

  return (
    <main className="flex-1 flex flex-col" style={{ boxShadow: `inset 0 8px 0 ${me.color}` }}>
      <header className="flex items-center justify-between px-5 pt-6">
        <div className="text-right">
          <div className="font-black text-lg" style={{ color: me.color }}>{me.name}</div>
          <div className="text-sm text-[var(--muted)]">{me.rep_name}</div>
        </div>
        <div className="text-left">
          <div className="text-2xl font-black gold-text">{me.score}</div>
          <div className="text-xs text-[var(--muted)]">נקודות</div>
        </div>
      </header>

      {me.disqualified && <BigMsg color="#ee6d75">הופסקת מהמשחק ע״י המנחה</BigMsg>}

      {!me.disqualified && (game.stage === 'title' || game.stage === 'boarding') && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <IconClock />
          <div className="text-[var(--muted)] text-lg font-bold">ממתינים למנחה שיתחיל את השלב הבא...</div>
        </div>
      )}

      {!me.disqualified && game.stage === 'trivia' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
          {iAmLocked && <BigMsg color="var(--gold)">אתה ראשון — ענה עכשיו!</BigMsg>}
          {otherLocked && <BigMsg color="var(--muted)">{lockedSectorName} לחץ/ה ראשון/ה</BigMsg>}
          {!game.buzzer_open && !game.buzzer_locked_by && <p className="text-[var(--muted)] text-lg">הבאזר סגור — המתן/י למנחה</p>}
          {excluded && !game.buzzer_locked_by && <p className="text-[var(--muted)] text-lg">כבר עניתם בשאלה הזו — הסיבוב הזה שייך לאחרים</p>}
          <button
            onClick={() => {
              // Fire and forget: no disabled state, no in-flight lock, nothing that
              // could swallow a press. Every tap reaches the server and is heard on
              // the big screen, even if this sector cannot win the round.
              playerAction('press_buzzer', { p_sector_id: mySector, p_round_id: game.round_id }).catch(() => {});
            }}
            className="rounded-full font-black text-3xl active:scale-95 transition-transform"
            style={{
              width: 'min(280px,68vw)', aspectRatio: '1',
              background: iAmLocked
                ? 'radial-gradient(circle at 35% 28%,#fff3c8,#f5c451 62%,#b9860f)'
                : 'radial-gradient(circle at 35% 28%,#ffecb7,#ea7c19 62%,#87310f)',
              boxShadow: liveRound ? '0 0 0 12px #f8af3825,0 0 0 22px #f8af3815,0 14px 0 #70220e,0 22px 40px #000b' : '0 14px 0 #70220e,0 22px 40px #000b',
              color: '#351300',
              // never greyed out — a dead-looking button is the one thing that stops
              // a rep from pressing, and pressing is always allowed now
              filter: 'none',
            }}
          >
            באזר
          </button>
        </div>
      )}

      {!me.disqualified && game.stage === 'truefalse' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="bg-[#101b52] border border-[#526cbb] rounded-2xl px-5 py-4 text-lg leading-relaxed">{game.current_story_text}</div>
          {voteRemaining !== null && (
            <div className="text-2xl font-black" style={{ color: voteRemaining <= 5 ? '#ee6d75' : 'var(--gold)' }}>
              00:{String(voteRemaining).padStart(2, '0')}
            </div>
          )}
          {alreadyVoted || voted ? (
            <p className="text-[var(--gold)] text-lg font-bold">ההצבעה נשלחה — ממתינים לשאר המדורים</p>
          ) : voteTimeUp ? (
            <p className="text-[var(--muted)] text-lg font-bold">הזמן נגמר — ממתינים לחשיפת התשובה</p>
          ) : (
            <div className="flex gap-3.5 w-full">
              <button
                onClick={async () => { setVoted(true); await playerAction('submit_vote', { p_sector_id: mySector, p_round_id: game.round_id, p_vote: true }).catch(() => {}); }}
                className="flex-1 rounded-2xl py-9 text-2xl font-black"
                style={{ background: '#16522b', color: '#7bda92' }}
              >
                קרה
              </button>
              <button
                onClick={async () => { setVoted(true); await playerAction('submit_vote', { p_sector_id: mySector, p_round_id: game.round_id, p_vote: false }).catch(() => {}); }}
                className="flex-1 rounded-2xl py-9 text-2xl font-black"
                style={{ background: '#5c1a1a', color: '#ff9d9d' }}
              >
                לא קרה
              </button>
            </div>
          )}
        </div>
      )}

      {!me.disqualified && game.stage === 'speech' && <BigMsg color="var(--gold)">שלב נאומי הפרידה — עקבו אחרי המסך הגדול</BigMsg>}
      {!me.disqualified && (game.stage === 'leaderboard' || game.stage === 'end') && <BigMsg color="var(--gold)">תודה שלקחת חלק! עקבו אחרי המסך הגדול</BigMsg>}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 flex items-center justify-center text-[var(--muted)] text-lg">{children}</main>;
}

function BigMsg({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="flex-1 flex items-center justify-center px-8">
      <div className="pop-in text-2xl font-black text-center" style={{ color }}>{children}</div>
    </div>
  );
}
