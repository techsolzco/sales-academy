-- ============================================================
-- Migration 025: Assignment Content Items
-- Run in Supabase SQL Editor BEFORE deploying updated code.
-- ============================================================

-- Junction table: which FAQs/Scripts/Objections an assignment covers
CREATE TABLE IF NOT EXISTS public.assignment_content_items (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  content_type  text NOT NULL CHECK (content_type IN ('faq', 'script', 'objection')),
  content_id    uuid NOT NULL,
  content_title text NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(assignment_id, content_type, content_id)
);

ALTER TABLE public.assignment_content_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (salesman needs to see study list)
DO $$ BEGIN
  CREATE POLICY "assignment_content_items: authenticated read"
    ON public.assignment_content_items FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Only admins can insert/update/delete
DO $$ BEGIN
  CREATE POLICY "assignment_content_items: admin insert"
    ON public.assignment_content_items FOR INSERT TO authenticated
    WITH CHECK (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "assignment_content_items: admin delete"
    ON public.assignment_content_items FOR DELETE TO authenticated
    USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS idx_aci_assignment_id
  ON public.assignment_content_items(assignment_id);

-- Verify
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assignment_content_items'
ORDER BY ordinal_position;
