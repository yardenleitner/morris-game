import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SEED_CONTENT } from './seedContent';
import { BuzzEvent, GameState, PublicState, Sector, SectorId, SpeechWord, TriviaQuestion, TrueFalseStory } from './types';

// Server-side game state. Never import this from a 'use client' component —
// it holds the answer key, and it only exists in the Next.js process.
//
// Everything lives in one process on the host laptop and is flushed to
// data/state.json after every change, so a browser refresh, a crashed tab, or a
// restarted server all resume mid-show with scores intact. This is why the app
// must run as one long-lived server (`next start`) and not on a serverless host,
// where each request would get its own empty copy of this module.

const STATE_FILE = join(process.cwd(), 'data', 'state.json');

// One point for a correct answer, one point off for a wrong one — the scale the
// question sheet is written against. Kept on the game row (rather than inlined at
// the award sites) so a host could still retune it mid-show via host_set_scoring.
const SCORING = { correct: 1, wrong: -1 };

// How many recent buzzer presses to keep on the game row. It only has to cover one
// round's worth of simultaneous slams: the screen sounds each unseen id once and
// then forgets it, so this is a broadcast buffer, not a history.
const BUZZ_LOG_SIZE = 24;

// A closing speech is worth more than a trivia question: three points either way.
const SPEECH_SCORE = 3;

const SECTOR_SEED: { id: SectorId; name: string; color: string }[] = [
  { id: '452', name: 'מדור 452', color: '#f5a623' },
  { id: '454', name: 'מדור 454', color: '#e8452c' },
  { id: '455', name: 'מדור 455', color: '#8b5cf6' },
  { id: '456', name: 'מדור 456', color: '#22c55e' },
  { id: '458', name: 'מדור 458', color: '#38bdf8' },
];

export interface StoreState {
  game: GameState;
  sectors: Sector[];
  questions: TriviaQuestion[];
  stories: TrueFalseStory[];
  words: SpeechWord[];
  // round_id -> sector that got there first. Replaces the buzz_winner table's
  // primary key, which is what used to make the race unambiguous.
  buzzWinners: Record<string, string>;
  // Monotonic id for buzz events. Kept outside the game row so it keeps climbing
  // across rounds; the screen only ever compares ids, never their absolute value.
  buzzSeq: number;
}

const now = () => new Date().toISOString();

function freshState(): StoreState {
  return {
    game: {
      id: 1,
      stage: 'title',
      rules_for: null,
      round_id: randomUUID(),
      round_excluded: [],
      current_question_id: null,
      current_question_text: null,
      current_question_options: null,
      revealed_correct_index: null,
      last_award_correct: null,
      current_story_id: null,
      current_story_text: null,
      current_votes: {},
      revealed_is_true: null,
      current_word: null,
      current_word_index: 0,
      speech_result: null,
      buzzer_open: false,
      buzzer_locked_by: null,
      buzzer_locked_at: null,
      buzz_events: [],
      timer_ends_at: null,
      timer_seconds: null,
      scoring_correct: SCORING.correct,
      scoring_wrong: SCORING.wrong,
      winner_sector_id: null,
      updated_at: now(),
    },
    sectors: SECTOR_SEED.map((s) => ({
      ...s,
      rep_name: null,
      score: 0,
      correct_count: 0,
      first_buzz_count: 0,
      connected: false,
      disqualified: false,
      updated_at: now(),
    })),
    questions: SEED_CONTENT.questions.map((q) => ({ ...q, id: randomUUID(), used: false })),
    stories: SEED_CONTENT.stories.map((s) => ({ ...s, id: randomUUID(), used: false })),
    words: SEED_CONTENT.words.map((w) => ({ ...w, id: randomUUID() })),
    buzzWinners: {},
    buzzSeq: 0,
  };
}

type Listener = (state: PublicState) => void;

interface Holder {
  state: StoreState | null;
  listeners: Set<Listener>;
}

// Survives dev-mode hot reloads, which would otherwise swap in a new module
// (and a new empty state) under live SSE connections mid-game.
const globalRef = globalThis as unknown as { __morrisStore?: Holder };
const holder: Holder = (globalRef.__morrisStore ??= { state: null, listeners: new Set() });

function persist(state: StoreState) {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  // Write-then-rename: a crash mid-write leaves the previous good file intact
  // rather than a truncated one that would lose the scoreboard.
  writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  renameSync(tmp, STATE_FILE);
}

function load(): StoreState {
  if (holder.state) return holder.state;
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as StoreState;
    // A state file written by an older build predates the buzz log. Fill it in
    // rather than throwing the evening's scores away over a missing array.
    parsed.buzzSeq ??= 0;
    parsed.game.buzz_events ??= [];
    parsed.game.speech_result ??= null;
    parsed.game.rules_for ??= null;
    holder.state = parsed;
  } catch {
    const fresh = freshState();
    persist(fresh);
    holder.state = fresh;
  }
  return holder.state;
}

export function publicState(): PublicState {
  const s = load();
  return { game: s.game, sectors: s.sectors };
}

export function subscribe(listener: Listener): () => void {
  load();
  holder.listeners.add(listener);
  return () => holder.listeners.delete(listener);
}

function commit<T>(state: StoreState, result: T): T {
  state.game.updated_at = now();
  persist(state);
  const snapshot: PublicState = { game: state.game, sectors: state.sectors };
  // One broken connection must not stop the rest of the room from updating.
  for (const listener of holder.listeners) {
    try {
      listener(snapshot);
    } catch {
      /* dropped connection */
    }
  }
  return result;
}

type Args = Record<string, any>;
type Handler = (state: StoreState, args: Args) => unknown;

const sectorOf = (s: StoreState, id: unknown) => s.sectors.find((x) => x.id === id);

export const HOST_ACTIONS: Record<string, Handler> = {
  host_reset_game(s) {
    for (const sec of s.sectors) {
      sec.score = 0;
      sec.correct_count = 0;
      sec.first_buzz_count = 0;
      sec.disqualified = false;
      sec.rep_name = null;
      sec.connected = false;
      sec.updated_at = now();
    }
    for (const q of s.questions) q.used = false;
    for (const st of s.stories) st.used = false;
    s.buzzWinners = {};
    Object.assign(s.game, {
      stage: 'title',
      rules_for: null,
      round_id: randomUUID(),
      round_excluded: [],
      current_question_id: null,
      current_question_text: null,
      current_question_options: null,
      revealed_correct_index: null,
      last_award_correct: null,
      current_story_id: null,
      current_story_text: null,
      current_votes: {},
      revealed_is_true: null,
      current_word: null,
      current_word_index: 0,
      speech_result: null,
      buzzer_open: false,
      buzzer_locked_by: null,
      buzzer_locked_at: null,
      buzz_events: [],
      timer_ends_at: null,
      timer_seconds: null,
      scoring_correct: SCORING.correct,
      scoring_wrong: SCORING.wrong,
      winner_sector_id: null,
    });
  },

  host_set_stage(s, a) {
    s.game.stage = a.p_stage;
  },

  // Shown before every round now, not just the first — p_for is which round is
  // about to start, so both /screen and /host know which rules to display and
  // which "start" action the host's button should fire next.
  host_show_rules(s, a) {
    s.game.stage = 'rules';
    s.game.rules_for = a.p_for;
  },

  host_new_round(s) {
    Object.assign(s.game, {
      round_id: randomUUID(),
      round_excluded: [],
      buzzer_open: false,
      buzzer_locked_by: null,
      buzzer_locked_at: null,
    });
  },

  host_load_question(s, a) {
    const q = s.questions.find((x) => x.id === a.p_question_id);
    if (!q) return;
    Object.assign(s.game, {
      stage: 'trivia',
      current_question_id: q.id,
      current_question_text: q.question,
      current_question_options: q.options,
      revealed_correct_index: null,
      last_award_correct: null,
      round_id: randomUUID(),
      round_excluded: [],
      buzzer_open: true,
      buzzer_locked_by: null,
      buzzer_locked_at: null,
      timer_ends_at: null,
      winner_sector_id: null,
    });
  },

  host_load_story(s, a) {
    const story = s.stories.find((x) => x.id === a.p_story_id);
    if (!story) return;
    Object.assign(s.game, {
      stage: 'truefalse',
      current_story_id: story.id,
      current_story_text: story.story,
      current_votes: {},
      revealed_is_true: null,
      round_id: randomUUID(),
      round_excluded: [],
      // No time limit on this round — every sector votes whenever it's ready, and
      // the host reveals once everyone has (or gives up waiting).
      timer_seconds: null,
      timer_ends_at: null,
      winner_sector_id: null,
    });
  },

  host_reveal_trivia(s) {
    const q = s.questions.find((x) => x.id === s.game.current_question_id);
    s.game.revealed_correct_index = q ? q.correct_index : null;
    if (q) q.used = true;
  },

  host_reveal_truefalse(s) {
    const story = s.stories.find((x) => x.id === s.game.current_story_id);
    const truth = story ? story.is_true : null;
    s.game.revealed_is_true = truth;
    if (story) story.used = true;

    for (const [sectorId, vote] of Object.entries(s.game.current_votes)) {
      const sec = sectorOf(s, sectorId);
      if (!sec) continue;
      if (vote === truth) {
        sec.score += s.game.scoring_correct;
        sec.correct_count += 1;
      } else {
        sec.score += s.game.scoring_wrong;
      }
      sec.updated_at = now();
    }
  },

  host_open_buzzer(s) {
    Object.assign(s.game, { buzzer_open: true, buzzer_locked_by: null, buzzer_locked_at: null });
  },

  host_close_buzzer(s) {
    s.game.buzzer_open = false;
  },

  host_disqualify_current(s) {
    const locked = s.game.buzzer_locked_by;
    if (!locked) return;
    Object.assign(s.game, {
      round_excluded: [...s.game.round_excluded, locked],
      buzzer_locked_by: null,
      buzzer_locked_at: null,
      buzzer_open: true,
    });
  },

  host_award(s, a) {
    const sec = sectorOf(s, a.p_sector_id);
    const correct = a.p_correct === true;
    if (sec) {
      sec.score += correct ? s.game.scoring_correct : s.game.scoring_wrong;
      if (correct) sec.correct_count += 1;
      sec.updated_at = now();
    }

    if (correct) {
      const q = s.questions.find((x) => x.id === s.game.current_question_id);
      if (q) q.used = true;
      Object.assign(s.game, {
        winner_sector_id: a.p_sector_id,
        last_award_correct: true,
        revealed_correct_index: q ? q.correct_index : null,
      });
    } else {
      // A wrong answer reopens the buzzer for everyone else, on a new round id so
      // the sector that just missed cannot re-buzz.
      Object.assign(s.game, {
        winner_sector_id: a.p_sector_id,
        last_award_correct: false,
        round_excluded: [...s.game.round_excluded, a.p_sector_id],
        round_id: randomUUID(),
        buzzer_locked_by: null,
        buzzer_locked_at: null,
        buzzer_open: true,
      });
    }
  },

  host_adjust_score(s, a) {
    const sec = sectorOf(s, a.p_sector_id);
    if (!sec) return;
    sec.score += a.p_delta;
    sec.updated_at = now();
  },

  host_set_scoring(s, a) {
    s.game.scoring_correct = a.p_correct;
    s.game.scoring_wrong = a.p_wrong;
  },

  host_set_timer(s, a) {
    s.game.timer_seconds = a.p_seconds;
    s.game.timer_ends_at = new Date(Date.now() + a.p_seconds * 1000).toISOString();
  },

  host_clear_timer(s) {
    s.game.timer_seconds = null;
    s.game.timer_ends_at = null;
  },

  host_set_speech_word(s, a) {
    const word = s.words.find((w) => w.order_index === a.p_index);
    Object.assign(s.game, {
      stage: 'speech',
      current_word: word ? word.word : null,
      current_word_index: a.p_index,
      // a fresh speaker has not been judged yet
      speech_result: null,
    });
  },

  // The host marks each closing speech a success or not; the speaker is whoever
  // SPEECH_ORDER puts at this word's position, so the host never picks a sector by
  // hand and the round cannot drift out of order.
  host_award_speech(s, a) {
    const sec = sectorOf(s, a.p_sector_id);
    if (!sec) return;
    const success = a.p_success === true;
    sec.score += success ? SPEECH_SCORE : -SPEECH_SCORE;
    sec.updated_at = now();
    s.game.speech_result = success;
  },

  host_set_disqualified(s, a) {
    const sec = sectorOf(s, a.p_sector_id);
    if (!sec) return;
    sec.disqualified = a.p_disqualified === true;
    sec.updated_at = now();
  },
};

export const PLAYER_ACTIONS: Record<string, Handler> = {
  join_sector(s, a) {
    const sec = sectorOf(s, a.p_sector_id);
    if (!sec) return;
    sec.rep_name = a.p_name;
    sec.connected = true;
    sec.updated_at = now();
  },

  // Returns whether this press won the round.
  //
  // Phones never gate their own buzzer — every press arrives here and is logged so
  // the screen can sound it, and this function alone decides who actually claimed
  // the round. Node runs these one at a time, so the first request to reach the
  // eligibility check wins and later ones see the round already taken, which is the
  // same guarantee the old unique index gave.
  press_buzzer(s, a): boolean {
    const { p_sector_id: sectorId, p_round_id: roundId } = a;
    const sec = sectorOf(s, sectorId);
    if (!sec) return false;

    // A press can be heard but still not win: the round may have moved on, the
    // buzzer may be shut, this sector may already have missed this question, or
    // somebody simply got here first.
    const won =
      s.game.round_id === roundId &&
      s.game.buzzer_open &&
      !s.game.round_excluded.includes(sectorId) &&
      !s.buzzWinners[roundId];

    if (won) {
      s.buzzWinners[roundId] = sectorId;
      Object.assign(s.game, {
        buzzer_open: false,
        buzzer_locked_by: sectorId,
        buzzer_locked_at: now(),
        last_award_correct: null,
      });
      sec.first_buzz_count += 1;
      sec.updated_at = now();
    }

    const event: BuzzEvent = { id: ++s.buzzSeq, sector_id: sectorId, at: now(), won };
    s.game.buzz_events = [...s.game.buzz_events, event].slice(-BUZZ_LOG_SIZE);
    return won;
  },

  submit_vote(s, a) {
    const { p_sector_id: sectorId, p_round_id: roundId } = a;
    if (s.game.round_id !== roundId) return;
    if (sectorId in s.game.current_votes) return; // one vote per sector per round
    s.game.current_votes = { ...s.game.current_votes, [sectorId]: a.p_vote === true };
  },
};

export function runAction(fn: string, args: Args, isHost: boolean) {
  const handler = isHost ? (HOST_ACTIONS[fn] ?? PLAYER_ACTIONS[fn]) : PLAYER_ACTIONS[fn];
  if (!handler) return { error: HOST_ACTIONS[fn] ? 'unauthorized' : 'unknown action' };
  const state = load();
  return { data: commit(state, handler(state, args)) };
}

// ===== content editing (/host/content) =====

const CONTENT_KEYS = { questions: 'questions', stories: 'stories', words: 'words' } as const;
export type ContentTable = keyof typeof CONTENT_KEYS;

export const isContentTable = (t: string): t is ContentTable => t in CONTENT_KEYS;

type ContentRow = { id: string; order_index: number } & Record<string, any>;
const rowsOf = (s: StoreState, table: ContentTable) => s[table] as unknown as ContentRow[];

export function contentList(table: ContentTable) {
  return [...rowsOf(load(), table)].sort((a, b) => a.order_index - b.order_index);
}

export function contentInsert(table: ContentTable, data: Record<string, any>) {
  const state = load();
  const row = { ...data, id: randomUUID() } as ContentRow;
  if (table !== 'words') row.used = false;
  rowsOf(state, table).push(row);
  return commit(state, row);
}

export function contentUpdate(table: ContentTable, id: string, data: Record<string, any>) {
  const state = load();
  const row = rowsOf(state, table).find((r) => r.id === id);
  if (!row) return null;
  Object.assign(row, data, { id });
  return commit(state, row);
}

export function contentDelete(table: ContentTable, id: string) {
  const state = load();
  const rows = rowsOf(state, table);
  const i = rows.findIndex((r) => r.id === id);
  if (i >= 0) rows.splice(i, 1);
  return commit(state, true);
}
