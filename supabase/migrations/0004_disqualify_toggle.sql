create or replace function host_set_disqualified(p_key text, p_sector_id text, p_disqualified boolean)
returns void language plpgsql security definer as $$
begin
  if not check_host_key(p_key) then raise exception 'unauthorized'; end if;
  update sectors set disqualified = p_disqualified where id = p_sector_id;
end; $$;

grant execute on function host_set_disqualified to anon, authenticated;
