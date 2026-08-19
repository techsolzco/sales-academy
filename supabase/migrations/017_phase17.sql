-- ============================================================
-- Migration 017: Phase 17 — Assignments, Quizzes, Voice Recordings, Reseller Pledge, English Practice
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add tool_id to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL;

-- 2. Add tool_id to quizzes (for auto-generated tool quizzes)
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL;

-- 3. Add approval workflow to quiz_attempts
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS admin_notes text;

-- 4. Admin audio visibility toggle on voice notes
ALTER TABLE public.voice_notes ADD COLUMN IF NOT EXISTS admin_audio_visible boolean DEFAULT true;

-- 5. Salesman practice recordings (one per user per voice note)
CREATE TABLE IF NOT EXISTS public.salesman_voice_recordings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  voice_note_id uuid NOT NULL REFERENCES public.voice_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  audio_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(voice_note_id, user_id)
);

ALTER TABLE public.salesman_voice_recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "svr: user own" ON public.salesman_voice_recordings;
CREATE POLICY "svr: user own" ON public.salesman_voice_recordings
  FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "svr: admin all" ON public.salesman_voice_recordings;
CREATE POLICY "svr: admin all" ON public.salesman_voice_recordings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Reseller application pledge fields
ALTER TABLE public.reseller_applications ADD COLUMN IF NOT EXISTS learned_summary text;
ALTER TABLE public.reseller_applications ADD COLUMN IF NOT EXISTS agreed_to_terms boolean DEFAULT false;
ALTER TABLE public.reseller_applications ADD COLUMN IF NOT EXISTS pledge_submitted_at timestamptz;

-- 7. English practice AI settings
CREATE TABLE IF NOT EXISTS public.english_practice_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  persona_instructions text NOT NULL DEFAULT 'You are a friendly English tutor helping salespeople practice daily conversational and client-communication English. Keep responses encouraging and concise.',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.english_practice_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eps: admin all" ON public.english_practice_settings;
CREATE POLICY "eps: admin all" ON public.english_practice_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
DROP POLICY IF EXISTS "eps: auth read" ON public.english_practice_settings;
CREATE POLICY "eps: auth read" ON public.english_practice_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert default settings row
INSERT INTO public.english_practice_settings (persona_instructions)
VALUES ('You are a friendly English tutor helping salespeople practice daily conversational and client-communication English. Correct grammar gently. Keep responses short and encouraging.')
ON CONFLICT DO NOTHING;

-- 8. Add assignment_id to quiz_attempts for linking (if not exists)
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL;
