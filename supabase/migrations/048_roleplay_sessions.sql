-- AI mock-customer roleplay practice (audit §3 #8).
-- A practice chat where Gemini plays a difficult Pakistani customer
-- (scenario sourced from a published objection / script) and scores the
-- intern's replies. Staff own their sessions; admins can read all
-- sessions for review. Distinct from English-practice chat.
create table if not exists public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario_title text not null,
  objection_id uuid references public.objections(id) on delete set null,
  script_id uuid references public.scripts(id) on delete set null,
  transcript jsonb not null default '[]'::jsonb,
  score integer check (score is null or (score >= 0 and score <= 100)),
  feedback text,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.roleplay_sessions enable row level security;

-- Users read their own sessions; admins read all (review).
create policy "Users SELECT own roleplay_sessions, admins SELECT all"
  on public.roleplay_sessions for select to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- Users create only their own sessions.
create policy "Users INSERT own roleplay_sessions"
  on public.roleplay_sessions for insert to authenticated
  with check (user_id = auth.uid());

-- Users update only their own sessions. WITH CHECK pins user_id so a
-- user cannot reassign a session to someone else (see audit S11 pattern).
create policy "Users UPDATE own roleplay_sessions"
  on public.roleplay_sessions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists roleplay_sessions_user_created_idx
  on public.roleplay_sessions (user_id, created_at desc);
