-- Split the old single 'lobby' stage into an explicit two-step opening flow:
-- 'title' (hero screen, host hasn't started anything yet) -> 'boarding'
-- (QR + registration, host approves reps) -> game stages as before.
alter table game_state alter column stage set default 'title';

create or replace function host_reset_game(p_key text)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update sectors set score=0, correct_count=0, first_buzz_count=0, disqualified=false, rep_name=null, connected=false where true;
  update trivia_questions set used=false where true;
  update truefalse_stories set used=false where true;
  update game_state set stage='title', round_id=gen_random_uuid(), round_excluded='{}',
    current_question_id=null, current_question_text=null, current_question_options=null, revealed_correct_index=null,
    current_story_id=null, current_story_text=null, current_votes='{}', revealed_is_true=null,
    current_word=null, current_word_index=0,
    buzzer_open=false, buzzer_locked_by=null, buzzer_locked_at=null,
    timer_ends_at=null, timer_seconds=null, winner_sector_id=null, updated_at=now()
  where id=1;
end; $$;

update game_state set stage = 'title' where id = 1 and stage = 'lobby';
