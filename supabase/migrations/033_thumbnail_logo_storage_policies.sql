-- ============================================================
--  Migration 033: course-thumbnails / tool-logos upload policies (S5)
--  Fixes: supabase/migrations/011_phase11.sql:21-35
--
--  PROBLEM: both "admin upload" INSERT policies checked only
--  bucket_id = ... AND auth.role() = 'authenticated'. Any
--  self-registered salesman could upload arbitrary files (incl.
--  HTML/SVG) into these public buckets.
--
--  FIX: auth.role() = 'authenticated' is replaced with
--  public.current_user_role() = 'admin' in both policies, and
--  TO authenticated is added (the originals had no TO clause).
--  The public-read SELECT policies are intentionally untouched.
--  DROP + CREATE so re-running this file is safe.
-- ============================================================

drop policy if exists "course-thumbnails: admin upload" on storage.objects;
create policy "course-thumbnails: admin upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'course-thumbnails'
    and public.current_user_role() = 'admin'
  );

drop policy if exists "tool-logos: admin upload" on storage.objects;
create policy "tool-logos: admin upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tool-logos'
    and public.current_user_role() = 'admin'
  );
