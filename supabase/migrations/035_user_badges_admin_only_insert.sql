-- ============================================================
--  Migration 035: user_badges INSERT is now admin-only (audit S7)
--  Fixes: supabase/migrations/004_phase4.sql
--
--  PROBLEM: policy "Service role/Auth INSERT user_badges"
--  WITH CHECK (user_id = auth.uid() OR current_user_role() =
--  'admin') let ANY user insert a user_badges row for THEMSELVES
--  with ANY badge_id — self-award any badge, no criteria check.
--  (lib/actions/badges.ts checkAndAwardBadge is exported with no
--  auth check; see audit B20.)
--
--  FIX: inserts are admin-only. The service-role client bypasses
--  RLS, so a future server-side award path that uses the service
--  client is unaffected.
--
--  BREAKING CHANGE — READ BEFORE APPLYING: checkAndAwardBadge
--  (lib/actions/badges.ts:7) uses the ANON client and is called
--  with the acting user's own id from lessons.ts (first_lesson /
--  first_course / five_courses), community.ts (first_post) and
--  scripts.ts (first_script_copy). After this migration every one
--  of those award inserts will FAIL with an RLS error (caught and
--  swallowed by the callers, so no crash — badges simply stop
--  being awarded). That is the intended closure of the hole:
--  badge awarding must move to an admin-gated / service-client
--  path that verifies the earning condition server-side before
--  inserting. Do NOT "fix" this by restoring the self-insert.
--  SELECT policies on user_badges are untouched.
-- ============================================================

drop policy if exists "Service role/Auth INSERT user_badges" on public.user_badges;
create policy "Admin INSERT user_badges"
  on public.user_badges for insert
  to authenticated
  with check (public.current_user_role() = 'admin');
