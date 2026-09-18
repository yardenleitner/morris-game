-- מי מכיר את מוריס? — schema
create extension if not exists pgcrypto;

-- ========== TABLES ==========

create table sectors (
  id text primary key,               -- '452' | '454' | '455' | '456' | '458'
  name text not null,                -- 'מדור 452'
  color text not null,                -- hex color for this sector
  rep_name text,                      -- name typed on join
  score int not null default 0,
  correct_count int not null default 0,
  first_buzz_count int not null default 0,
  connected boolean not null default false,
  disqualified boolean not null default false, -- kicked out of whole game by host
  updated_at timestamptz not null default now()
);

create table trivia_questions (
  id uuid primary key default gen_random_uuid(),
  order_index int not null,
  question text not null,
  options text[] not null,            -- 4 options
  correct_index int not null,         -- 0-3
  used boolean not null default false
);

create table truefalse_stories (
  id uuid primary key default gen_random_uuid(),
  order_index int not null,
  story text not null,
  is_true boolean not null,
  used boolean not null default false
);

create table speech_words (
  id uuid primary key default gen_random_uuid(),
  order_index int not null,
  word text not null
);

-- single-row live game state, drives all 3 screens via realtime
create table game_state (
  id int primary key default 1,
  stage text not null default 'lobby',  -- lobby|trivia|truefalse|speech|leaderboard|end
  round_id uuid not null default gen_random_uuid(),
  round_excluded text[] not null default '{}', -- sectors disqualified for THIS round only

  -- trivia
  current_question_id uuid references trivia_questions(id),
  current_question_text text,
  current_question_options text[],
  revealed_correct_index int,          -- null until host reveals

  -- true/false
  current_story_id uuid references truefalse_stories(id),
  current_story_text text,
  current_votes jsonb not null default '{}',   -- {"452": true, "454": false}
  revealed_is_true boolean,

  -- speech
  current_word text,
  current_word_index int not null default 0,

  -- buzzer
  buzzer_open boolean not null default false,
  buzzer_locked_by text references sectors(id),
  buzzer_locked_at timestamptz,

  -- timer
  timer_ends_at timestamptz,
  timer_seconds int,

  -- scoring config
  scoring_correct int not null default 100,
  scoring_wrong int not null default 0,

  winner_sector_id text,
  updated_at timestamptz not null default now()
);

create table buzz_winner (
  round_id uuid primary key,
  sector_id text not null references sectors(id),
  created_at timestamptz not null default now()
);

insert into game_state (id) values (1);

insert into sectors (id, name, color) values
  ('452', 'מדור 452', '#f5a623'),
  ('454', 'מדור 454', '#e8452c'),
  ('455', 'מדור 455', '#8b5cf6'),
  ('456', 'מדור 456', '#22c55e'),
  ('458', 'מדור 458', '#38bdf8');

-- ========== RLS ==========
alter table sectors enable row level security;
alter table game_state enable row level security;
alter table trivia_questions enable row level security;
alter table truefalse_stories enable row level security;
alter table speech_words enable row level security;
alter table buzz_winner enable row level security;

-- public (anon) can read live-safe state only
create policy sectors_select on sectors for select using (true);
create policy game_state_select on game_state for select using (true);
create policy buzz_winner_select on buzz_winner for select using (true);
-- trivia_questions / truefalse_stories / speech_words: NOT selectable by anon (contain answers) —
-- host reads/writes them via service-role server routes only. No policy = no access under RLS.

-- ========== HOST AUTH ==========
-- one-off event, no accounts: a shared secret the host UI holds, checked inside every
-- host_* RPC. Not bulletproof, fine for a single-event MVP.
create table app_secret (k text primary key, v text not null);
insert into app_secret values ('host_key', encode(gen_random_bytes(9), 'base64'));

create or replace function check_host_key(p_key text) returns boolean
language sql stable as $$
  select exists(select 1 from app_secret where k = 'host_key' and v = p_key);
$$;

create or replace function get_host_key_for_setup() returns text
language sql security definer as $$
  select v from app_secret where k = 'host_key';
$$;

-- ========== RPCs ==========

-- player joins a sector
create or replace function join_sector(p_sector_id text, p_name text)
returns void language plpgsql security definer as $$
begin
  update sectors set rep_name = p_name, connected = true, updated_at = now()
  where id = p_sector_id;
end; $$;

-- player presses the buzzer — server decides who's first via PK conflict on round_id
create or replace function press_buzzer(p_sector_id text, p_round_id uuid)
returns boolean language plpgsql security definer as $$
declare v_open boolean; v_excluded text[]; v_won boolean := false;
begin
  select buzzer_open, round_excluded into v_open, v_excluded from game_state where id = 1 and round_id = p_round_id;
  if v_open is not true then return false; end if;
  if p_sector_id = any(v_excluded) then return false; end if;

  begin
    insert into buzz_winner (round_id, sector_id) values (p_round_id, p_sector_id);
    v_won := true;
  exception when unique_violation then
    v_won := false;
  end;

  if v_won then
    update game_state
      set buzzer_open = false, buzzer_locked_by = p_sector_id, buzzer_locked_at = now(), updated_at = now()
      where id = 1 and round_id = p_round_id;
    update sectors set first_buzz_count = first_buzz_count + 1 where id = p_sector_id;
  end if;
  return v_won;
end; $$;

-- player votes קרה/לא קרה
create or replace function submit_vote(p_sector_id text, p_round_id uuid, p_vote boolean)
returns void language plpgsql security definer as $$
begin
  update game_state
    set current_votes = current_votes || jsonb_build_object(p_sector_id, p_vote), updated_at = now()
    where id = 1 and round_id = p_round_id
      and not (current_votes ? p_sector_id); -- one vote per sector per round
end; $$;

-- ===== host RPCs (require host_key) =====

create or replace function host_reset_game(p_key text)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update sectors set score=0, correct_count=0, first_buzz_count=0, disqualified=false, rep_name=null, connected=false;
  update trivia_questions set used=false;
  update truefalse_stories set used=false;
  update game_state set stage='lobby', round_id=gen_random_uuid(), round_excluded='{}',
    current_question_id=null, current_question_text=null, current_question_options=null, revealed_correct_index=null,
    current_story_id=null, current_story_text=null, current_votes='{}', revealed_is_true=null,
    current_word=null, current_word_index=0,
    buzzer_open=false, buzzer_locked_by=null, buzzer_locked_at=null,
    timer_ends_at=null, timer_seconds=null, winner_sector_id=null, updated_at=now()
  where id=1;
end; $$;

create or replace function host_set_stage(p_key text, p_stage text)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update game_state set stage = p_stage, updated_at = now() where id = 1;
end; $$;

create or replace function host_new_round(p_key text)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update game_state set round_id = gen_random_uuid(), round_excluded='{}',
    buzzer_open=false, buzzer_locked_by=null, buzzer_locked_at=null, updated_at = now()
  where id = 1;
end; $$;

create or replace function host_load_question(p_key text, p_question_id uuid)
returns void language plpgsql security definer as $$
declare q trivia_questions%rowtype;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select * into q from trivia_questions where id = p_question_id;
  update game_state set
    stage='trivia', current_question_id=q.id, current_question_text=q.question,
    current_question_options=q.options, revealed_correct_index=null,
    round_id=gen_random_uuid(), round_excluded='{}',
    buzzer_open=false, buzzer_locked_by=null, buzzer_locked_at=null,
    timer_ends_at=null, winner_sector_id=null, updated_at=now()
  where id=1;
end; $$;

create or replace function host_load_story(p_key text, p_story_id uuid)
returns void language plpgsql security definer as $$
declare s truefalse_stories%rowtype;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select * into s from truefalse_stories where id = p_story_id;
  update game_state set
    stage='truefalse', current_story_id=s.id, current_story_text=s.story,
    current_votes='{}', revealed_is_true=null, round_id=gen_random_uuid(), round_excluded='{}',
    timer_ends_at=null, winner_sector_id=null, updated_at=now()
  where id=1;
end; $$;

create or replace function host_reveal_trivia(p_key text)
returns void language plpgsql security definer as $$
declare v_qid uuid; v_correct int;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select current_question_id into v_qid from game_state where id=1;
  select correct_index into v_correct from trivia_questions where id = v_qid;
  update game_state set revealed_correct_index = v_correct, updated_at=now() where id=1;
  update trivia_questions set used = true where id = v_qid;
end; $$;

create or replace function host_reveal_truefalse(p_key text)
returns void language plpgsql security definer as $$
declare v_sid uuid; v_truth boolean; r record;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select current_story_id into v_sid from game_state where id=1;
  select is_true into v_truth from truefalse_stories where id = v_sid;
  update game_state set revealed_is_true = v_truth, updated_at=now() where id=1;
  update truefalse_stories set used = true where id = v_sid;

  for r in select key as sector_id, value::boolean as vote
           from game_state, jsonb_each_text(current_votes) where id=1 loop
    if r.vote = v_truth then
      update sectors set score = score + (select scoring_correct from game_state where id=1),
        correct_count = correct_count + 1 where id = r.sector_id;
    end if;
  end loop;
end; $$;

create or replace function host_open_buzzer(p_key text)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update game_state set buzzer_open = true, buzzer_locked_by=null, buzzer_locked_at=null, updated_at = now() where id = 1;
end; $$;

create or replace function host_close_buzzer(p_key text)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update game_state set buzzer_open = false, updated_at = now() where id = 1;
end; $$;

-- disqualify whoever currently holds the buzzer lock for this round, reopen for the rest
create or replace function host_disqualify_current(p_key text)
returns void language plpgsql security definer as $$
declare v_locked text;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select buzzer_locked_by into v_locked from game_state where id=1;
  if v_locked is not null then
    update game_state set round_excluded = array_append(round_excluded, v_locked),
      buzzer_locked_by = null, buzzer_locked_at = null, buzzer_open = true, updated_at = now()
    where id = 1;
  end if;
end; $$;

create or replace function host_award(p_key text, p_sector_id text, p_correct boolean)
returns void language plpgsql security definer as $$
declare v_delta int;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select case when p_correct then scoring_correct else scoring_wrong end into v_delta from game_state where id=1;
  update sectors set score = score + v_delta,
    correct_count = correct_count + (case when p_correct then 1 else 0 end)
  where id = p_sector_id;
  update game_state set winner_sector_id = p_sector_id, updated_at = now() where id = 1;
end; $$;

create or replace function host_adjust_score(p_key text, p_sector_id text, p_delta int)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update sectors set score = score + p_delta where id = p_sector_id;
end; $$;

create or replace function host_set_scoring(p_key text, p_correct int, p_wrong int)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update game_state set scoring_correct = p_correct, scoring_wrong = p_wrong, updated_at = now() where id = 1;
end; $$;

create or replace function host_set_timer(p_key text, p_seconds int)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update game_state set timer_seconds = p_seconds,
    timer_ends_at = now() + make_interval(secs => p_seconds), updated_at = now()
  where id = 1;
end; $$;

create or replace function host_clear_timer(p_key text)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update game_state set timer_ends_at = null, timer_seconds = null, updated_at = now() where id = 1;
end; $$;

create or replace function host_set_speech_word(p_key text, p_index int)
returns void language plpgsql security definer as $$
declare v_word text;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select word into v_word from speech_words where order_index = p_index;
  update game_state set stage='speech', current_word = v_word, current_word_index = p_index, updated_at = now() where id = 1;
end; $$;

-- ========== GRANTS ==========
revoke all on all tables in schema public from anon, authenticated;
grant select on sectors, game_state, buzz_winner to anon, authenticated;
grant execute on function join_sector, press_buzzer, submit_vote to anon, authenticated;
grant execute on function
  host_reset_game, host_set_stage, host_new_round, host_load_question, host_load_story,
  host_reveal_trivia, host_reveal_truefalse, host_open_buzzer, host_close_buzzer,
  host_disqualify_current, host_award, host_adjust_score, host_set_scoring,
  host_set_timer, host_clear_timer, host_set_speech_word
  to anon, authenticated;

-- realtime
alter publication supabase_realtime add table sectors, game_state;
