-- ============================================================
--  Sales Academy — Phase 13: Tool Onboarding Wizard schema
--  Idempotent: safe to re-run
-- ============================================================

-- Add knowledge_summary to tools table for AI context retrieval
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS knowledge_summary text;

-- Add tool_id FK to courses table (faqs, scripts, objections, voice_notes already have it)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_courses_tool_id ON public.courses(tool_id);
