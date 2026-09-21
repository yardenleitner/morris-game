export type SectorId = '452' | '454' | '455' | '456' | '458';

export interface Sector {
  id: SectorId;
  name: string;
  color: string;
  rep_name: string | null;
  score: number;
  correct_count: number;
  first_buzz_count: number;
  connected: boolean;
  disqualified: boolean;
  updated_at: string;
}

// Every press of a phone's buzzer, winner or not. The screen sounds one buzzer
// per event, so the room hears all five reps slam the button rather than only the
// one the server happened to receive first. `won` marks the press that actually
// claimed the round.
export interface BuzzEvent {
  id: number;
  sector_id: SectorId;
  at: string;
  won: boolean;
}

export type Stage = 'title' | 'boarding' | 'rules' | 'trivia' | 'truefalse' | 'speech' | 'leaderboard' | 'end';

export interface GameState {
  id: number;
  stage: Stage;
  round_id: string;
  round_excluded: string[];

  current_question_id: string | null;
  current_question_text: string | null;
  current_question_options: string[] | null;
  revealed_correct_index: number | null;
  last_award_correct: boolean | null;

  current_story_id: string | null;
  current_story_text: string | null;
  current_votes: Record<string, boolean>;
  revealed_is_true: boolean | null;

  current_word: string | null;
  current_word_index: number;
  // Whether the host judged the speech currently on screen a success. null while
  // the speaker is still going.
  speech_result: boolean | null;

  buzzer_open: boolean;
  buzzer_locked_by: SectorId | null;
  buzzer_locked_at: string | null;
  buzz_events: BuzzEvent[];

  timer_ends_at: string | null;
  timer_seconds: number | null;

  scoring_correct: number;
  scoring_wrong: number;

  winner_sector_id: SectorId | null;
  updated_at: string;
}

export interface TriviaQuestion {
  id: string;
  order_index: number;
  question: string;
  options: string[];
  correct_index: number;
  used: boolean;
}

export interface TrueFalseStory {
  id: string;
  order_index: number;
  story: string;
  is_true: boolean;
  used: boolean;
}

export interface SpeechWord {
  id: string;
  order_index: number;
  word: string;
}

export const SECTOR_IDS: SectorId[] = ['452', '454', '455', '456', '458'];

// The closing round is one speech per sector, in this fixed order, so the word at
// order_index N belongs to SPEECH_ORDER[N - 1]. Its length is also what bounds the
// round: five speakers, five words, however many words the content table holds.
export const SPEECH_ORDER: SectorId[] = ['452', '454', '455', '456', '458'];

export const speakerForWordIndex = (index: number): SectorId | null =>
  SPEECH_ORDER[index - 1] ?? null;

// Starting content for a brand-new state file. Ids and `used` flags are assigned
// at that point, so the seed itself carries neither.
export interface SeedContent {
  questions: Omit<TriviaQuestion, 'id' | 'used'>[];
  stories: Omit<TrueFalseStory, 'id' | 'used'>[];
  words: Omit<SpeechWord, 'id'>[];
}

// What every device is allowed to see. Deliberately excludes the question bank —
// it holds the answers, and /play runs on the contestants' own phones.
export interface PublicState {
  game: GameState;
  sectors: Sector[];
}
