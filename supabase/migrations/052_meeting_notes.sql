-- Meeting notes + action items (audit §3 #16).
-- Notes and follow-up tasks attached to a meeting, visible to invitees.

create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.meeting_notes enable row level security;
alter table public.meeting_action_items enable row level security;

-- SELECT: admins + meeting invitees (checked via meeting_invitees).
create policy "Admins and invitees SELECT meeting_notes"
  on public.meeting_notes for select to authenticated
  using (
    current_user_role() = 'admin'
    or exists (
      select 1 from public.meeting_invitees mi
      where mi.meeting_id = meeting_notes.meeting_id
        and mi.user_id = auth.uid()
    )
  );

create policy "Admins and invitees SELECT meeting_action_items"
  on public.meeting_action_items for select to authenticated
  using (
    current_user_role() = 'admin'
    or exists (
      select 1 from public.meeting_invitees mi
      where mi.meeting_id = meeting_action_items.meeting_id
        and mi.user_id = auth.uid()
    )
  );

-- INSERT / UPDATE / DELETE: admins only.
create policy "Admin ALL meeting_notes"
  on public.meeting_notes for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Admin ALL meeting_action_items"
  on public.meeting_action_items for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- Exception: an assignee may UPDATE their own action items (the app only
-- ever toggles `done` through toggleActionItem; RLS cannot restrict an
-- UPDATE to a single column, so the done-only rule is enforced in code).
create policy "Assignees UPDATE own meeting_action_items"
  on public.meeting_action_items for update to authenticated
  using (assignee_id = auth.uid())
  with check (assignee_id = auth.uid());

create index if not exists meeting_notes_meeting_idx
  on public.meeting_notes (meeting_id, created_at desc);

create index if not exists meeting_action_items_meeting_idx
  on public.meeting_action_items (meeting_id, created_at);
