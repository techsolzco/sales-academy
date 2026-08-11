-- ============================================================
--  Sales Academy — Phase 2 Schema Migration (FIXED)
--  Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- ── STEP 1: Drop all RLS policies that reference is_published ──────────
-- Must happen BEFORE the column is dropped or renamed.

DROP POLICY IF EXISTS "courses: authenticated can read published"
  ON public.courses;

DROP POLICY IF EXISTS "modules: visible if course is published or user is admin"
  ON public.modules;

DROP POLICY IF EXISTS "lessons: visible if module's course is published or admin"
  ON public.lessons;

DROP POLICY IF EXISTS "content_blocks: visible if lesson's course is published or admin"
  ON public.content_blocks;

-- ── STEP 2: Add new columns to courses ────────────────────────────────────
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category                   text,
  ADD COLUMN IF NOT EXISTS difficulty                 text
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS status                     text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS visibility                 text NOT NULL DEFAULT 'all'
    CHECK (visibility IN ('all', 'selected', 'team'));

-- ── STEP 3: Migrate is_published → status (preserves existing data) ───────
UPDATE public.courses SET status = 'published' WHERE is_published = true;

-- ── STEP 4: Drop the old column (now safe — policies are gone) ────────────
ALTER TABLE public.courses DROP COLUMN IF EXISTS is_published;

-- ── STEP 5: Add new columns to modules ────────────────────────────────────
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS status            text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived'));

-- ── STEP 6: Add new columns to lessons ────────────────────────────────────
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS subtitle      text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS difficulty    text
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS is_required   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived'));

-- ── STEP 7: Recreate all RLS policies using the new status column ──────────

-- courses: salesmen see published only
CREATE POLICY "courses: authenticated can read published"
  ON public.courses FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'published');

-- modules: salesmen see modules whose course is published
CREATE POLICY "modules: visible if course is published or user is admin"
  ON public.modules FOR SELECT
  USING (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id
        AND courses.status = 'published'
    )
  );

-- lessons: salesmen see lessons whose course is published
CREATE POLICY "lessons: visible if module's course is published or admin"
  ON public.lessons FOR SELECT
  USING (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id
        AND c.status = 'published'
    )
  );

-- content_blocks: salesmen see blocks whose course is published
CREATE POLICY "content_blocks: visible if lesson's course is published or admin"
  ON public.content_blocks FOR SELECT
  USING (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.courses c ON c.id = m.course_id
      WHERE l.id = content_blocks.lesson_id
        AND c.status = 'published'
    )
  );
