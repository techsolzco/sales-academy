-- Function #9 (audit §3 #9, MEDIUM-HIGH): quiz question bank + per-quiz
-- max_attempts column.
--
-- (a/b) question_bank / question_bank_options: a reusable pool of
-- multiple-choice questions an admin can copy into any quiz via
-- importBankQuestionIntoQuiz (lib/actions/question-bank.ts). Admins have
-- full access; any authenticated user may SELECT (read-only reference —
-- no INSERT/UPDATE/DELETE policy for non-admins).
--
-- (c) quizzes.max_attempts: per-quiz attempt limit. NOTE — the column is
-- added here ONLY. Enforcement inside submitQuizAttempt is SKIPPED in
-- this change because lib/actions/quizzes.ts is a hold file (unpushed
-- 034/035 work already enforces the phase-1 code default
-- MAX_QUIZ_ATTEMPTS = 3). The enforcement must land later in
-- lib/actions/quizzes.ts submitQuizAttempt: read quiz.max_attempts (fall
-- back to MAX_QUIZ_ATTEMPTS when null) and compare against the caller's
-- prior attempt count. Until then the column is stored but unused.
create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  category text,
  tool_id uuid references public.tools(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.question_bank_options (
  id uuid primary key default gen_random_uuid(),
  question_bank_id uuid not null references public.question_bank(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  order_index integer not null default 0
);

alter table public.question_bank enable row level security;
alter table public.question_bank_options enable row level security;

create policy "Admins full access question_bank"
  on public.question_bank for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Authenticated SELECT question_bank"
  on public.question_bank for select to authenticated
  using (true);

create policy "Admins full access question_bank_options"
  on public.question_bank_options for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Authenticated SELECT question_bank_options"
  on public.question_bank_options for select to authenticated
  using (true);

create index if not exists question_bank_tool_idx
  on public.question_bank (tool_id);

create index if not exists question_bank_category_idx
  on public.question_bank (category);

create index if not exists question_bank_options_question_idx
  on public.question_bank_options (question_bank_id);

-- Per-quiz attempt limit (column only — see the NOTE at the top of this
-- file: enforcement in submitQuizAttempt is a later change to the hold
-- file lib/actions/quizzes.ts). NULL = fall back to the code default.
alter table public.quizzes
  add column if not exists max_attempts integer;
