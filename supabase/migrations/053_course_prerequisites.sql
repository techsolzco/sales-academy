-- Course prerequisites + learning paths (audit §3 #17).
-- A course can require another course to be completed first. Admins define
-- the edges; staff gating is enforced in code (lib/actions/courses.ts
-- fetchTrainingAccess + the training pages), not by RLS, because
-- "complete" is an application-level definition (see lib/training-progress.ts).
create table if not exists public.course_prerequisites (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  required_course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (course_id, required_course_id),
  check (course_id <> required_course_id)
);

alter table public.course_prerequisites enable row level security;

-- Any signed-in user can read the graph (staff need it to see why a
-- course is locked; the admin UI needs it to manage edges).
create policy "Authenticated SELECT course_prerequisites"
  on public.course_prerequisites for select to authenticated
  using (true);

-- Only admins may create, change or remove prerequisite edges.
create policy "Admins INSERT course_prerequisites"
  on public.course_prerequisites for insert to authenticated
  with check (current_user_role() = 'admin');

create policy "Admins DELETE course_prerequisites"
  on public.course_prerequisites for delete to authenticated
  using (current_user_role() = 'admin');

create index if not exists course_prerequisites_course_idx
  on public.course_prerequisites (course_id);

create index if not exists course_prerequisites_required_idx
  on public.course_prerequisites (required_course_id);
