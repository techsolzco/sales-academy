-- ============================================================
--  Migration 031: Fix handle_new_user() privilege escalation (audit S1)
--  Fixes: supabase/migrations/001_initial_schema.sql:47-65
--
--  PROBLEM: the signup trigger copied `role` straight from
--  caller-controlled signup metadata:
--    coalesce(new.raw_user_meta_data->>'role', 'salesman')
--  Anyone holding only the anon key could call auth/v1/signup with
--  data: { role: 'admin' } and get a profiles row with role='admin'.
--
--  FIX: the role is ALWAYS 'salesman' here, regardless of metadata.
--  Admins are created only by an existing admin (profiles admin
--  policy / admin UI), never by self-registration.
--
--  DASHBOARD ACTION REQUIRED (do this BEFORE applying this file):
--  Supabase Dashboard -> Authentication -> Providers -> Email ->
--  disable "Allow new users to sign up" until this migration is live.
--
--  NOTE: this does NOT demote any admin row created via the old
--  trigger. Audit existing rows with the query below (run it in the
--  Supabase SQL Editor against the LIVE database — it was NOT run
--  here; this worker has no live-DB access):
--    -- SELECT id, email, role FROM public.profiles WHERE role = 'admin';
--  Any admin row you do not recognise must be investigated/demoted.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    -- SECURITY (S1): role is hardcoded. Signup metadata is
    -- caller-controlled and must NEVER decide the role.
    'salesman'
  );
  return new;
end;
$$;

-- The trigger itself (on_auth_user_created on auth.users) is unchanged
-- and is NOT recreated here; only the function body is replaced.
-- If the trigger was ever dropped, recreate it with:
--   drop trigger if exists on_auth_user_created on auth.users;
--   create trigger on_auth_user_created
--     after insert on auth.users
--     for each row execute function public.handle_new_user();
