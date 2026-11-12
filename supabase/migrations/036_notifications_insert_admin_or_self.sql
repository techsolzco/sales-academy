-- ============================================================
--  Migration 036: notifications INSERT — admin or self only (audit S8)
--  Fixes: supabase/migrations/004_phase4.sql
--
--  PROBLEM: policy "Authenticated INSERT notifications"
--  TO authenticated WITH CHECK (true) let any authenticated user
--  forge a notification to ANY user (user_id, title, body, type,
--  link all caller-controlled) — e.g. a fake "password reset"
--  notification to the admin.
--
--  FIX: inserts are allowed only for admins (any recipient) or for
--  a user notifying THEMSELVES (user_id = auth.uid()).
--
--  CALLER CHECK (grep over lib/actions + app, 2026-11-13):
--  Every notifications insert EXCEPT one uses the service client
--  (bypasses RLS) and is therefore unaffected:
--    assignments.ts:211,249 | enrollment.ts:144,260 |
--    meetings.ts:83,232 | tickets.ts:43,117,154,175 |
--    chat.ts:112 — all serviceClient.from('notifications').insert.
--  The ONE anon-client insert is lib/actions/badges.ts:37, inside
--  checkAndAwardBadge, inserting user_id = the user being awarded.
--  All current callers pass the acting user's OWN id, so the
--  self-insert clause keeps it working — BUT migration 035 makes
--  the preceding user_badges insert fail first for non-admins, so
--  in practice that notification stops firing until badge awarding
--  moves to a service-client path (see 035). No legitimate
--  cross-user anon-client notification insert exists in the repo.
--  Broadcast inserts (user_id IS NULL) via the anon client are now
--  blocked; none exist in the repo — broadcasts are service-client
--  only. SELECT/UPDATE policies on notifications are untouched.
-- ============================================================

drop policy if exists "Authenticated INSERT notifications" on public.notifications;
create policy "Admin or self INSERT notifications"
  on public.notifications for insert
  to authenticated
  with check (
    public.current_user_role() = 'admin'
    or user_id = auth.uid()
  );
