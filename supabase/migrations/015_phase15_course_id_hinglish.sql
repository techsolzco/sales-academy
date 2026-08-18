-- Phase 15: course_id FK + Hinglish dual-language columns
-- Run this in Supabase SQL Editor

-- 1. Add course_id to faqs, objections, scripts
ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.objections
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.voice_notes
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

-- 2. Add Hinglish dual-language columns to faqs
ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS question_hinglish text,
  ADD COLUMN IF NOT EXISTS short_answer_hinglish text,
  ADD COLUMN IF NOT EXISTS customer_ready_answer_hinglish text;

-- 3. Add Hinglish column to objections
ALTER TABLE public.objections
  ADD COLUMN IF NOT EXISTS recommended_response_hinglish text;

-- 4. Add Hinglish column to scripts
ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS content_hinglish text;

-- 5. Fix user_preferences language check to include 'hi' (Hinglish)
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_language_check;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_language_check
  CHECK (language IN ('en', 'ur', 'hi'));

-- 6. Indexes for course_id foreign key queries
CREATE INDEX IF NOT EXISTS idx_faqs_course_id ON public.faqs(course_id);
CREATE INDEX IF NOT EXISTS idx_objections_course_id ON public.objections(course_id);
CREATE INDEX IF NOT EXISTS idx_scripts_course_id ON public.scripts(course_id);
