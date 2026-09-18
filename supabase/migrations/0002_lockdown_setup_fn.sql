-- Postgres grants EXECUTE to PUBLIC by default on new functions, which would let
-- anon call get_host_key_for_setup() via PostgREST and read the host secret. Lock it down
-- to the postgres/service_role only.
revoke execute on function get_host_key_for_setup from public, anon, authenticated;
revoke execute on function check_host_key from public, anon, authenticated;
grant execute on function check_host_key to postgres, service_role;
grant execute on function get_host_key_for_setup to postgres, service_role;
