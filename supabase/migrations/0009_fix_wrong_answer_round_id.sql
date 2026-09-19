-- Bug found while testing 0007: buzz_winner's primary key is round_id (one winner per
-- round). host_award's wrong-answer branch reopened the buzzer but kept the same
-- round_id, so buzz_winner already had a row for it — the next team's press_buzzer
-- silently lost to a unique_violation and never locked the buzzer. Rotate round_id
-- (keeping round_excluded, which lives on game_state and isn't tied to the old round row)
-- so the reopened buzzer can actually be won again.
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
      round_id = gen_random_uuid(),
      buzzer_locked_by = null, buzzer_locked_at = null, buzzer_open = true,
      updated_at = now()
    where id = 1;
  end if;
end; $$;
