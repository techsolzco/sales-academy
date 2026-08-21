-- ============================================================
--  Sales Academy - Migration 019: Soft-Delete / Recycle Bin
--  Adds deleted_at (nullable timestamptz) to all content tables.
--  Soft-delete pattern: set deleted_at = now() instead of DELETE.
--  All list queries should filter WHERE deleted_at IS NULL.
-- ============================================================

-- Add deleted_at column to content tables
ALTER TABLE public.courses      ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.modules      ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.lessons      ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.faqs         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.scripts      ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.objections   ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.voice_notes  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.assignments  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.quizzes      ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.tools        ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Partial indexes for fast WHERE deleted_at IS NULL filtering
CREATE INDEX IF NOT EXISTS idx_courses_not_deleted     ON public.courses(id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_modules_not_deleted     ON public.modules(id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_not_deleted     ON public.lessons(id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_faqs_not_deleted        ON public.faqs(id)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scripts_not_deleted     ON public.scripts(id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_objections_not_deleted  ON public.objections(id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_voice_notes_not_deleted ON public.voice_notes(id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_not_deleted ON public.assignments(id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_not_deleted     ON public.quizzes(id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tools_not_deleted       ON public.tools(id)        WHERE deleted_at IS NULL;
