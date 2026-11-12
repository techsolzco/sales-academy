-- ============================================================
--  Migration 040: policies published-read — authenticated only (S19)
--  Fixes: supabase/migrations/012_phase12.sql
--
--  PROBLEM (verified from 012_phase12.sql): the policy
--  "policies: salesman read published" was created with NO TO
--  clause, so it defaults to PUBLIC — anonymous users could read
--  published company policies.
--
--  FIX: recreate the identical policy with TO authenticated.
--  DROP + CREATE so re-running this file is safe.
--
--  NOTE: the sibling policy "policies: admin all" (FOR ALL, also
--  no TO clause) is intentionally left alone: its USING clause
--  requires current_user_role() = 'admin', which anonymous users
--  can never satisfy, so it grants nothing to anon. Only the
--  published-read policy leaked.
-- ============================================================

drop policy if exists "policies: salesman read published" on public.policies;
create policy "policies: salesman read published"
  on public.policies for select
  to authenticated
  using (is_published = true);
