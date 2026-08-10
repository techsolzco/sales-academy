-- ============================================================
--  Sales Academy — Initial Schema Migration
--  Run this in your Supabase SQL Editor (or via supabase CLI)
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Helpers ───────────────────────────────────────────────────────────────

-- Automatically updates `updated_at` on any table that has that column.
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
--  TABLE: profiles
--  One row per auth.users entry. Created automatically via
--  the trigger below when a new user signs up.
-- ============================================================

-- The `role` column uses TEXT (not an ENUM) so that new roles
-- ('manager', 'trainer', etc.) can be added in the future without
-- an ALTER TYPE migration — just update app-level policy checks.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  role          text not null default 'salesman'
                  check (role in ('admin', 'salesman', 'manager', 'trainer')),
  status        text not null default 'active'
                  check (status in ('active', 'inactive', 'suspended')),
  avatar_url    text,
  department    text,
  joining_date  date,
  created_at    timestamptz not null default now()
);

comment on column public.profiles.role is
  'User role. Uses TEXT (not ENUM) so future roles can be added via check constraint update only.';

-- Auto-create a profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'salesman')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  TABLE: courses
-- ============================================================
create table if not exists public.courses (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  thumbnail_url text,
  is_published  boolean not null default false,
  created_by    uuid not null references public.profiles(id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger set_courses_updated_at
  before update on public.courses
  for each row execute function public.handle_updated_at();

-- ============================================================
--  TABLE: modules
-- ============================================================
create table if not exists public.modules (
  id           uuid primary key default uuid_generate_v4(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  title        text not null,
  description  text,
  order_index  integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_modules_course_id on public.modules(course_id);

-- ============================================================
--  TABLE: lessons
-- ============================================================
create table if not exists public.lessons (
  id                uuid primary key default uuid_generate_v4(),
  module_id         uuid not null references public.modules(id) on delete cascade,
  title             text not null,
  description       text,
  order_index       integer not null default 0,
  duration_minutes  integer,
  created_at        timestamptz not null default now()
);

create index if not exists idx_lessons_module_id on public.lessons(module_id);

-- ============================================================
--  TABLE: content_blocks
--  Flexible JSONB `content` allows different block types
--  (text, video, image, file, quiz) without separate tables.
-- ============================================================
create table if not exists public.content_blocks (
  id          uuid primary key default uuid_generate_v4(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  type        text not null check (type in ('text', 'video', 'image', 'file', 'quiz')),
  content     jsonb not null default '{}',
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_content_blocks_lesson_id on public.content_blocks(lesson_id);

-- ============================================================
--  TABLE: course_assignments
--  Tracks which salesmen are assigned to which courses.
-- ============================================================
create table if not exists public.course_assignments (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  due_date    timestamptz,
  unique (course_id, user_id)
);

create index if not exists idx_assignments_user_id    on public.course_assignments(user_id);
create index if not exists idx_assignments_course_id  on public.course_assignments(course_id);

-- ============================================================
--  TABLE: lesson_progress
--  One row per (user, lesson) pair — upserted as lessons complete.
-- ============================================================
create table if not exists public.lesson_progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  completed    boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists idx_progress_user_id   on public.lesson_progress(user_id);
create index if not exists idx_progress_lesson_id on public.lesson_progress(lesson_id);

create trigger set_lesson_progress_updated_at
  before update on public.lesson_progress
  for each row execute function public.handle_updated_at();

-- ============================================================
--  TABLE: audit_logs
--  Immutable append-only log. No UPDATE/DELETE allowed via RLS.
-- ============================================================
create table if not exists public.audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid not null references public.profiles(id) on delete restrict,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_actor_id   on public.audit_logs(actor_id);
create index if not exists idx_audit_created_at on public.audit_logs(created_at desc);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.courses           enable row level security;
alter table public.modules           enable row level security;
alter table public.lessons           enable row level security;
alter table public.content_blocks    enable row level security;
alter table public.course_assignments enable row level security;
alter table public.lesson_progress   enable row level security;
alter table public.audit_logs        enable row level security;

-- ── Helper function: get the caller's role without a subquery ──────────────
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── profiles ─────────────────────────────────────────────────────────────

-- Anyone can read their own profile
create policy "profiles: owner can read own"
  on public.profiles for select
  using (id = auth.uid());

-- Admins can read all profiles
create policy "profiles: admin can read all"
  on public.profiles for select
  using (public.current_user_role() = 'admin');

-- Admins can create profiles (e.g. inviting users)
create policy "profiles: admin can insert"
  on public.profiles for insert
  with check (public.current_user_role() = 'admin');

-- Admins can update any profile; users can update only their own
create policy "profiles: admin can update any"
  on public.profiles for update
  using (public.current_user_role() = 'admin');

create policy "profiles: owner can update own non-role fields"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    -- Prevent self-promotion: user cannot change their own role or status
    role = (select role from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
  );

-- Admins can delete profiles
create policy "profiles: admin can delete"
  on public.profiles for delete
  using (public.current_user_role() = 'admin');

-- ── courses ──────────────────────────────────────────────────────────────

-- Published courses visible to all authenticated users
create policy "courses: authenticated can read published"
  on public.courses for select
  using (auth.role() = 'authenticated' and is_published = true);

-- Admins can see all (published + drafts)
create policy "courses: admin can read all"
  on public.courses for select
  using (public.current_user_role() = 'admin');

create policy "courses: admin can insert"
  on public.courses for insert
  with check (public.current_user_role() = 'admin');

create policy "courses: admin can update"
  on public.courses for update
  using (public.current_user_role() = 'admin');

create policy "courses: admin can delete"
  on public.courses for delete
  using (public.current_user_role() = 'admin');

-- ── modules ──────────────────────────────────────────────────────────────

create policy "modules: visible if course is published or user is admin"
  on public.modules for select
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.courses
      where courses.id = modules.course_id and courses.is_published = true
    )
  );

create policy "modules: admin can insert"
  on public.modules for insert
  with check (public.current_user_role() = 'admin');

create policy "modules: admin can update"
  on public.modules for update
  using (public.current_user_role() = 'admin');

create policy "modules: admin can delete"
  on public.modules for delete
  using (public.current_user_role() = 'admin');

-- ── lessons ──────────────────────────────────────────────────────────────

create policy "lessons: visible if module's course is published or admin"
  on public.lessons for select
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.is_published = true
    )
  );

create policy "lessons: admin can insert"
  on public.lessons for insert
  with check (public.current_user_role() = 'admin');

create policy "lessons: admin can update"
  on public.lessons for update
  using (public.current_user_role() = 'admin');

create policy "lessons: admin can delete"
  on public.lessons for delete
  using (public.current_user_role() = 'admin');

-- ── content_blocks ───────────────────────────────────────────────────────

create policy "content_blocks: visible if lesson's course is published or admin"
  on public.content_blocks for select
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = content_blocks.lesson_id and c.is_published = true
    )
  );

create policy "content_blocks: admin can insert"
  on public.content_blocks for insert
  with check (public.current_user_role() = 'admin');

create policy "content_blocks: admin can update"
  on public.content_blocks for update
  using (public.current_user_role() = 'admin');

create policy "content_blocks: admin can delete"
  on public.content_blocks for delete
  using (public.current_user_role() = 'admin');

-- ── course_assignments ───────────────────────────────────────────────────

-- Salesmen see only their own assignments
create policy "assignments: user sees own"
  on public.course_assignments for select
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "assignments: admin can insert"
  on public.course_assignments for insert
  with check (public.current_user_role() = 'admin');

create policy "assignments: admin can update"
  on public.course_assignments for update
  using (public.current_user_role() = 'admin');

create policy "assignments: admin can delete"
  on public.course_assignments for delete
  using (public.current_user_role() = 'admin');

-- ── lesson_progress ──────────────────────────────────────────────────────

-- Users can only see and write their own progress
create policy "progress: user sees own"
  on public.lesson_progress for select
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "progress: user can insert own"
  on public.lesson_progress for insert
  with check (user_id = auth.uid());

create policy "progress: user can update own"
  on public.lesson_progress for update
  using (user_id = auth.uid());

-- ── audit_logs ───────────────────────────────────────────────────────────

-- Only admins can read audit logs; nobody can update or delete (immutable)
create policy "audit_logs: admin can read"
  on public.audit_logs for select
  using (public.current_user_role() = 'admin');

create policy "audit_logs: authenticated can insert"
  on public.audit_logs for insert
  with check (actor_id = auth.uid());

-- Intentionally NO update or delete policy — audit log is append-only.
