-- Gameplay polish pass:
--  * new 'rules' stage between boarding and trivia
--  * loading a question opens the buzzer immediately (one fewer host click)
--  * host_award now auto-reveals + excludes/reopens instead of leaving it to the host
--  * last_award_correct lets the screen show green+confetti / red feedback
--  * true/false round gets a real 15s timer and an actual wrong-answer penalty
--  * default scoring becomes +100 / -100 (was +100 / 0)

alter table game_state add column last_award_correct boolean;
alter table game_state alter column scoring_wrong set default -100;
update game_state set scoring_wrong = -100 where id = 1 and scoring_wrong = 0;

create or replace function host_load_question(p_key text, p_question_id uuid)
returns void language plpgsql security definer as $$
declare q trivia_questions%rowtype;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select * into q from trivia_questions where id = p_question_id;
  update game_state set
    stage='trivia', current_question_id=q.id, current_question_text=q.question,
    current_question_options=q.options, revealed_correct_index=null, last_award_correct=null,
    round_id=gen_random_uuid(), round_excluded='{}',
    buzzer_open=true, buzzer_locked_by=null, buzzer_locked_at=null,
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
    timer_seconds=15, timer_ends_at=now() + interval '15 seconds', winner_sector_id=null, updated_at=now()
  where id=1;
end; $$;

-- after a wrong answer the buzzer reopens and last_award_correct stays 'false' so the
-- display can flash red — but if someone else buzzes in on the same question, that stale
-- flag needs to clear so the screen shows "locked", not last question's wrong banner.
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
      set buzzer_open = false, buzzer_locked_by = p_sector_id, buzzer_locked_at = now(),
        last_award_correct = null, updated_at = now()
      where id = 1 and round_id = p_round_id;
    update sectors set first_buzz_count = first_buzz_count + 1 where id = p_sector_id;
  end if;
  return v_won;
end; $$;

-- correct: auto-reveal the answer, mark the question used, flag for confetti.
-- wrong: exclude that sector from re-buzzing this question and reopen the buzzer for the rest,
-- flag for the red "wrong" flash. Either way the host no longer has a separate manual step.
create or replace function host_award(p_key text, p_sector_id text, p_correct boolean)
returns void language plpgsql security definer as $$
declare v_delta int; v_qid uuid; v_correct_index int;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select case when p_correct then scoring_correct else scoring_wrong end into v_delta from game_state where id=1;
  update sectors set score = score + v_delta,
    correct_count = correct_count + (case when p_correct then 1 else 0 end)
  where id = p_sector_id;

  if p_correct then
    select current_question_id into v_qid from game_state where id=1;
    select correct_index into v_correct_index from trivia_questions where id = v_qid;
    update trivia_questions set used = true where id = v_qid;
    update game_state set
      winner_sector_id = p_sector_id, last_award_correct = true,
      revealed_correct_index = v_correct_index, updated_at = now()
    where id = 1;
  else
    update game_state set
      winner_sector_id = p_sector_id, last_award_correct = false,
      round_excluded = array_append(round_excluded, p_sector_id),
      buzzer_locked_by = null, buzzer_locked_at = null, buzzer_open = true,
      updated_at = now()
    where id = 1;
  end if;
end; $$;

-- true/false round was only ever paying out the correct-vote side; make it symmetric with trivia.
create or replace function host_reveal_truefalse(p_key text)
returns void language plpgsql security definer as $$
declare v_sid uuid; v_truth boolean; r record; v_correct int; v_wrong int;
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  select current_story_id into v_sid from game_state where id=1;
  select is_true into v_truth from truefalse_stories where id = v_sid;
  select scoring_correct, scoring_wrong into v_correct, v_wrong from game_state where id=1;
  update game_state set revealed_is_true = v_truth, updated_at=now() where id=1;
  update truefalse_stories set used = true where id = v_sid;

  for r in select key as sector_id, value::boolean as vote
           from game_state, jsonb_each_text(current_votes) where id=1 loop
    if r.vote = v_truth then
      update sectors set score = score + v_correct, correct_count = correct_count + 1 where id = r.sector_id;
    else
      update sectors set score = score + v_wrong where id = r.sector_id;
    end if;
  end loop;
end; $$;
