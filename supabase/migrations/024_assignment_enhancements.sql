-- ============================================================
-- Migration 024: Assignment Enhancements
-- Run in Supabase SQL Editor BEFORE deploying updated code.
-- ============================================================

-- 1. Link assignments to an optional quiz
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS quiz_id uuid REFERENCES public.quizzes(id) ON DELETE SET NULL;

-- 2. Richer submission proof fields
ALTER TABLE public.assignment_submissions
  ADD COLUMN IF NOT EXISTS image_url  text,    -- URL of uploaded photo / screenshot
  ADD COLUMN IF NOT EXISTS media_link text,    -- Google Drive / YouTube / WhatsApp link
  ADD COLUMN IF NOT EXISTS score      integer; -- Admin-assigned numeric score (0-100)

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assignments'
  AND column_name = 'quiz_id'
UNION ALL
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assignment_submissions'
  AND column_name IN ('image_url', 'media_link', 'score')
ORDER BY column_name;
