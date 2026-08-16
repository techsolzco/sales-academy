-- ============================================================
--  Sales Academy — Phase 11: Thumbnail storage + tool_id FK
--  Idempotent: safe to re-run
-- ============================================================

-- Storage buckets (created via SQL for local dev; Supabase dashboard auto-creates in prod)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tool-logos', 'tool-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for course-thumbnails
DROP POLICY IF EXISTS "course-thumbnails: public read" ON storage.objects;
CREATE POLICY "course-thumbnails: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-thumbnails');

DROP POLICY IF EXISTS "course-thumbnails: admin upload" ON storage.objects;
CREATE POLICY "course-thumbnails: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-thumbnails' AND auth.role() = 'authenticated');

-- Storage RLS policies for tool-logos
DROP POLICY IF EXISTS "tool-logos: public read" ON storage.objects;
CREATE POLICY "tool-logos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tool-logos');

DROP POLICY IF EXISTS "tool-logos: admin upload" ON storage.objects;
CREATE POLICY "tool-logos: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tool-logos' AND auth.role() = 'authenticated');

-- Add tool_id FK to knowledge base tables
ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL;

ALTER TABLE public.voice_notes
  ADD COLUMN IF NOT EXISTS tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL;

ALTER TABLE public.objections
  ADD COLUMN IF NOT EXISTS tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL;

ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL;

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_scripts_tool_id    ON public.scripts(tool_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_tool_id ON public.voice_notes(tool_id);
CREATE INDEX IF NOT EXISTS idx_objections_tool_id  ON public.objections(tool_id);
CREATE INDEX IF NOT EXISTS idx_faqs_tool_id        ON public.faqs(tool_id);
