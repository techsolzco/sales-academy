-- Content versioning for scripts / FAQs / objections (audit §3 #10).
-- Every edit snapshots the previous live row here before the update lands,
-- so an admin can view the history of an item and restore an earlier version.
-- Versions are append-only: no UPDATE policy (restore writes a new version
-- of the current row first, then writes the snapshot back to the live row).
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('script', 'faq', 'objection')),
  content_id uuid not null,
  snapshot jsonb not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.content_versions enable row level security;

create policy "Admins SELECT content_versions"
  on public.content_versions for select to authenticated
  using (public.current_user_role() = 'admin');

create policy "Admins INSERT content_versions"
  on public.content_versions for insert to authenticated
  with check (public.current_user_role() = 'admin');

create policy "Admins DELETE content_versions"
  on public.content_versions for delete to authenticated
  using (public.current_user_role() = 'admin');

create index if not exists content_versions_content_idx
  on public.content_versions (content_type, content_id, created_at desc);
