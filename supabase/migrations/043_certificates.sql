-- Certificates on course completion (audit §3 #1, HIGH).
-- A certificate is issued when a salesman finishes 100% of a course:
-- all published, non-deleted lessons complete AND all required KB reviews
-- done for the course's tool (see lib/actions/certificates.ts for the
-- single progress definition, mirrored from the course page).
-- RLS is enabled with SELECT policies only: a user reads their own
-- certificates, admins read all. There is NO INSERT policy for
-- authenticated users — rows are inserted only via the service-role
-- client inside issueCertificateIfComplete (like 042_email_verification_codes).
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  code text not null unique,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;

create policy "Users SELECT own certificates"
  on public.certificates for select to authenticated
  using (user_id = auth.uid() or current_user_role() = 'admin');

create index if not exists certificates_code_idx
  on public.certificates (code);

create index if not exists certificates_user_course_idx
  on public.certificates (user_id, course_id);
