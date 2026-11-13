-- Login history + new-device alerts (audit §3 #20).
-- One row per successful sign-in, recorded from app/auth/callback/route.ts
-- via recordLogin() in lib/actions/login-history.ts.
-- RLS: users SELECT own rows, admins SELECT all. NO INSERT/UPDATE/DELETE
-- policy for authenticated — only the service-role client writes rows
-- (same pattern as 042_email_verification_codes.sql).
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  signed_in_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  is_new_device boolean not null default false
);

alter table public.login_history enable row level security;

create policy "Users SELECT own login_history"
  on public.login_history for select to authenticated
  using (user_id = auth.uid() or current_user_role() = 'admin');

create index if not exists login_history_user_signed_in_idx
  on public.login_history (user_id, signed_in_at desc);
