-- Email OTP verification for sign-up (approval model + OTP).
-- Table stores only the SHA-256 hash of the 6-digit code, never the
-- plaintext. RLS is enabled with NO policies: anon/authenticated roles
-- can read/write nothing; only the service-role client in
-- lib/actions/email-otp.ts touches this table (it bypasses RLS).
create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_verification_codes enable row level security;

create index if not exists email_verification_codes_email_idx
  on public.email_verification_codes (email, created_at desc);

-- Stamp on the application when the applicant's email was verified by OTP
-- at submit time. approveApplication refuses applications without it.
alter table public.enrollment_applications
  add column if not exists email_verified_at timestamptz;
