-- ============================================================
--  Migration 034: quiz_options SELECT is now admin-only (audit S6)
--  Fixes: supabase/migrations/007_phase7.sql
--
--  PROBLEM: policy "Authenticated SELECT all quiz_options"
--  USING (true) exposed quiz_options.is_correct to EVERY
--  authenticated user. The student quiz page
--  (app/dashboard/quiz/[id]/page.tsx:28-35) and fetchQuiz
--  (lib/actions/quizzes.ts:151) selected quiz_options(*) and
--  shipped every correct answer to the student's browser.
--
--  FIX: SELECT on quiz_options is admin-only. The grading path is
--  safe: submitQuizAttempt (lib/actions/quizzes.ts:217+) reads the
--  quiz and its options through the SERVICE client, which bypasses
--  RLS, so scoring still sees is_correct.
--
--  BREAKING CHANGE — READ BEFORE APPLYING: until the student read
--  path is fixed in code (Worker B / app code), students will get
--  NO options back from quiz_options via the anon client:
--    - app/dashboard/quiz/[id]/page.tsx:27 selects
--      quiz_options.* via the anon client -> returns 0 rows.
--    - lib/actions/quizzes.ts fetchQuiz() embeds
--      options:quiz_options(*) via the anon client -> empty options.
--  The admin quiz pages keep working (admin role passes the policy).
--  RLS cannot hide a single column, so there is no narrower
--  DB-only fix: the code must read options WITHOUT is_correct
--  through a SECURITY DEFINER function / view, or via the service
--  client with is_correct stripped server-side. Do NOT "fix" this
--  by restoring USING (true).
--  Admin INSERT/UPDATE/DELETE policies on quiz_options are untouched.
-- ============================================================

drop policy if exists "Authenticated SELECT all quiz_options" on public.quiz_options;
create policy "Admin SELECT quiz_options"
  on public.quiz_options for select
  to authenticated
  using (public.current_user_role() = 'admin');
