-- Commission payout tracking + payment proof (audit §3 #6, HIGH).
-- Resellers see a payout status per commission (pending/paid) and upload a
-- payment proof image; admin may only mark a commission paid once a proof
-- is attached (enforced in lib/actions/reseller.ts markCommissionPaid).
--
-- The existing `status` column ('pending'|'paid', 005_phase5.sql) is kept
-- in sync by the server actions so existing callers (fetchResellers totals,
-- CommissionLedger/CommissionManager) keep working; `payout_status` is the
-- canonical payout state going forward. `paid_at` already exists from
-- 005_phase5.sql — the `if not exists` below is a no-op guard.
alter table public.commissions
  add column if not exists payout_status text not null default 'pending'
  check (payout_status in ('pending', 'paid'));

alter table public.commissions
  add column if not exists proof_url text;

alter table public.commissions
  add column if not exists paid_at timestamptz;

-- Backfill: commissions already marked paid keep their paid payout state.
update public.commissions
  set payout_status = 'paid'
  where status = 'paid' and payout_status = 'pending';

create index if not exists commissions_payout_status_idx
  on public.commissions (payout_status);

-- No new table RLS policy is needed for commissions: 005_phase5.sql already
-- grants resellers SELECT on their own rows and admins FOR ALL. Resellers
-- must NOT get a direct UPDATE policy (a broad owner UPDATE would let them
-- rewrite amount/status via the API); proof_url is written only through the
-- ownership-checked uploadCommissionProof server action, which uses the
-- service client after verifying the commission belongs to the caller.

-- Dedicated storage bucket for payment proofs.
-- A dedicated bucket (instead of reusing avatars / assignment-files) is
-- required because the phase-1 fixed upload path (lib/actions/storage.ts,
-- app/api/upload-image/route.ts) is admin-only: resellers cannot use it,
-- and proof images must be segregated from course/tool/avatar files with
-- their own owner-scoped write policy.
insert into storage.buckets (id, name, public)
values ('commission-proofs', 'commission-proofs', true)
on conflict (id) do nothing;

-- Storage policies for commission-proofs (follows the avatars pattern in
-- 004_phase4.sql: public read, owner-folder-scoped insert).
drop policy if exists "commission-proofs: public read" on storage.objects;
create policy "commission-proofs: public read"
  on storage.objects for select
  using (bucket_id = 'commission-proofs');

drop policy if exists "commission-proofs: reseller upload own proof" on storage.objects;
create policy "commission-proofs: reseller upload own proof"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'commission-proofs' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- No UPDATE/DELETE policy for resellers: a proof is immutable once stored;
-- re-uploading creates a new file and the server action repoints proof_url.
-- Admins manage proofs through the service client (bypasses storage RLS);
-- this policy covers any future admin-side direct storage access.
drop policy if exists "commission-proofs: admin manage" on storage.objects;
create policy "commission-proofs: admin manage"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'commission-proofs' and current_user_role() = 'admin')
  with check (bucket_id = 'commission-proofs' and current_user_role() = 'admin');
