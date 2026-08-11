-- ============================================================
--  Sales Academy — Phase 3: Knowledge Base Migration
--  Creates tables for FAQs, Scripts, Script Copies, Voice Notes,
--  Objections, Tools, full-text search indexes, and storage RLS.
-- ============================================================

-- ── 1. FAQS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faqs (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question              text NOT NULL,
  short_answer          text NOT NULL,
  detailed_answer       text,
  customer_ready_answer text,
  category              text NOT NULL DEFAULT 'General',
  tags                  text[] DEFAULT '{}',
  priority              integer NOT NULL DEFAULT 0,
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── 2. SCRIPTS TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scripts (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             text NOT NULL,
  script_type       text NOT NULL CHECK (script_type IN (
                      'greeting', 'whatsapp', 'voice_note_script', 'follow_up',
                      'closing', 'payment', 'objection_response', 'upsell',
                      'cross_sell', 'after_sales', 'review_request', 'warranty_explanation'
                    )),
  language          text NOT NULL DEFAULT 'English',
  content           text NOT NULL,
  when_to_use       text,
  related_product   text,
  related_objection text,
  tags              text[] DEFAULT '{}',
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── 3. SCRIPT COPIES LOG TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.script_copies (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  copied_at timestamptz NOT NULL DEFAULT now()
);

-- ── 4. VOICE NOTES TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             text NOT NULL,
  audio_url         text NOT NULL,
  transcript        text,
  purpose           text,
  when_to_send      text,
  related_lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  language          text NOT NULL DEFAULT 'English',
  duration_seconds  integer,
  key_points        text[] DEFAULT '{}',
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── 5. OBJECTIONS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.objections (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  objection_text       text NOT NULL,
  meaning              text,
  recommended_response text NOT NULL,
  alternative_response text,
  do_not_say           text,
  related_product      text,
  related_lesson_id    uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  difficulty           text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status               text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 6. TOOLS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tools (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 text NOT NULL,
  logo_url             text,
  description          text,
  website_url          text,
  category             text NOT NULL DEFAULT 'Sales' CHECK (category IN (
                         'AI Tools', 'Design Tools', 'Video Tools', 'Marketing Tools',
                         'Research Tools', 'Productivity', 'Sales', 'Automation'
                       )),
  pricing              text,
  best_for             text,
  features             text[] DEFAULT '{}',
  tutorial_link        text,
  youtube_tutorial_link text,
  tags                 text[] DEFAULT '{}',
  status               text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_faqs_status ON public.faqs(status);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs(category);
CREATE INDEX IF NOT EXISTS idx_scripts_status ON public.scripts(status);
CREATE INDEX IF NOT EXISTS idx_scripts_script_type ON public.scripts(script_type);
CREATE INDEX IF NOT EXISTS idx_script_copies_user ON public.script_copies(user_id);
CREATE INDEX IF NOT EXISTS idx_script_copies_script ON public.script_copies(script_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_status ON public.voice_notes(status);
CREATE INDEX IF NOT EXISTS idx_objections_status ON public.objections(status);
CREATE INDEX IF NOT EXISTS idx_tools_status ON public.tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_category ON public.tools(category);

-- ── ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- FAQs Policies
CREATE POLICY "faqs: admin full access" ON public.faqs FOR ALL
  USING (public.current_user_role() = 'admin');
CREATE POLICY "faqs: salesmen read published" ON public.faqs FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'published');

-- Scripts Policies
CREATE POLICY "scripts: admin full access" ON public.scripts FOR ALL
  USING (public.current_user_role() = 'admin');
CREATE POLICY "scripts: salesmen read published" ON public.scripts FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'published');

-- Script Copies Policies
CREATE POLICY "script_copies: admin read all" ON public.script_copies FOR SELECT
  USING (public.current_user_role() = 'admin');
CREATE POLICY "script_copies: user insert own" ON public.script_copies FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "script_copies: user read own" ON public.script_copies FOR SELECT
  USING (auth.uid() = user_id);

-- Voice Notes Policies
CREATE POLICY "voice_notes: admin full access" ON public.voice_notes FOR ALL
  USING (public.current_user_role() = 'admin');
CREATE POLICY "voice_notes: salesmen read published" ON public.voice_notes FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'published');

-- Objections Policies
CREATE POLICY "objections: admin full access" ON public.objections FOR ALL
  USING (public.current_user_role() = 'admin');
CREATE POLICY "objections: salesmen read published" ON public.objections FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'published');

-- Tools Policies
CREATE POLICY "tools: admin full access" ON public.tools FOR ALL
  USING (public.current_user_role() = 'admin');
CREATE POLICY "tools: salesmen read published" ON public.tools FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'published');

-- ── SUPABASE STORAGE BUCKET FOR VOICE NOTES ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for voice-notes bucket
CREATE POLICY "voice_notes_storage: admin full access" ON storage.objects FOR ALL
  USING (bucket_id = 'voice-notes' AND public.current_user_role() = 'admin');

CREATE POLICY "voice_notes_storage: authenticated read" ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-notes' AND auth.role() = 'authenticated');
