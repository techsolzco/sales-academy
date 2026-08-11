-- ============================================================
--  Sales Academy — Phase 2 Schema Migration
--  Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- ── courses: add new fields ────────────────────────────────────────────
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category              text,
  ADD COLUMN IF NOT EXISTS difficulty            text
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS status                text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS visibility            text NOT NULL DEFAULT 'all'
    CHECK (visibility IN ('all', 'selected', 'team'));

-- Migrate is_published → status (preserves existing data)
UPDATE public.courses SET status = 'published' WHERE is_published = true;

-- Drop old column
ALTER TABLE public.courses DROP COLUMN IF EXISTS is_published;

-- ── modules: add new fields ────────────────────────────────────────────
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS status            text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived'));

-- ── lessons: add new fields ────────────────────────────────────────────
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS subtitle      text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS difficulty    text
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS is_required   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived'));

-- ── Update RLS: courses use status instead of is_published ────────────
DROP POLICY IF EXISTS "courses: authenticated can read published" ON public.courses;

CREATE POLICY "courses: authenticated can read published"
  ON public.courses FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'published');
