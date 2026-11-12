-- ============================================================
--  Migration 037: Add WITH CHECK to UPDATE policies missing one (S11)
--  Fixes: supabase/migrations/007_phase7.sql and 004_phase4.sql
--  and 001_initial_schema.sql (lesson_progress).
--
--  PROBLEM: in Postgres an UPDATE without WITH CHECK is not
--  re-validated after the write, so the USING clause alone does
--  not constrain the NEW row:
--  - assignment_submissions: a salesman could update their own
--    pending submission and set status='approved' (+ score /
--    feedback), bypassing admin-gated reviewSubmission.
--  - lesson_progress: user_id could be reassigned to another user.
--  - community_posts / community_replies: user_id could be changed
--    to impersonate another author.
--
--  FIX: each policy below is dropped and recreated with the same
--  USING clause plus a WITH CHECK that pins the new row to the
--  same ownership / status the USING clause required.
--  The admin UPDATE policies on these tables are untouched, so
--  admin review flows (e.g. reviewSubmission approving a
--  submission) are unaffected.
-- ============================================================

-- 1. assignment_submissions — own pending submissions only.
--    New row must still belong to the caller and stay 'pending'.
drop policy if exists "Users UPDATE own pending assignment_submissions"
  on public.assignment_submissions;
create policy "Users UPDATE own pending assignment_submissions"
  on public.assignment_submissions for update
  to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status in ('pending'));

-- 2. lesson_progress — own rows only; user_id cannot be reassigned.
drop policy if exists "progress: user can update own"
  on public.lesson_progress;
create policy "progress: user can update own"
  on public.lesson_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. community_posts — own posts, or admin on any post.
drop policy if exists "Users UPDATE own posts or Admin UPDATE any"
  on public.community_posts;
create policy "Users UPDATE own posts or Admin UPDATE any"
  on public.community_posts for update
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');

-- 4. community_replies — own replies, or admin on any reply.
drop policy if exists "Users UPDATE own replies or Admin UPDATE any"
  on public.community_replies;
create policy "Users UPDATE own replies or Admin UPDATE any"
  on public.community_replies for update
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');
