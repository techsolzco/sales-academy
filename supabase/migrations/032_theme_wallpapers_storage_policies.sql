-- ============================================================
--  Migration 032: theme-wallpapers storage policies (audit S4)
--  Fixes: supabase/migrations/023_theme_packs.sql:29-40
--
--  PROBLEM: the INSERT and DELETE policies were named "Admin ..."
--  but contained NO role check at all (only bucket_id), and no TO
--  clause — anyone, including anonymous users, could upload to or
--  delete from this public bucket.
--
--  FIX: both policies now require an authenticated admin:
--  TO authenticated AND public.current_user_role() = 'admin'.
--  The public-read SELECT policy is intentionally untouched.
--  Precedent for current_user_role() in a storage policy:
--  003_phase3_knowledge_base.sql ("voice_notes_storage: admin full
--  access"). DROP + CREATE so re-running this file is safe.
-- ============================================================

drop policy if exists "Admin upload theme wallpapers" on storage.objects;
create policy "Admin upload theme wallpapers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'theme-wallpapers'
    and public.current_user_role() = 'admin'
  );

drop policy if exists "Admin delete theme wallpapers" on storage.objects;
create policy "Admin delete theme wallpapers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'theme-wallpapers'
    and public.current_user_role() = 'admin'
  );
