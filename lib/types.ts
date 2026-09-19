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

  buzzer_open: boolean;
  buzzer_locked_by: SectorId | null;
  buzzer_locked_at: string | null;

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
