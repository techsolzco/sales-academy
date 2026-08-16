-- ============================================================
--  Sales Academy — Phase 12: Profile fields, policies, KB reviews, password resets
-- ============================================================

-- Add bio and phone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Company Policies
CREATE TABLE IF NOT EXISTS public.policies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policies: admin all" ON public.policies;
CREATE POLICY "policies: admin all" ON public.policies
  FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "policies: salesman read published" ON public.policies;
CREATE POLICY "policies: salesman read published" ON public.policies
  FOR SELECT USING (is_published = true);

-- Password Reset Requests
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  full_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "password_resets: public insert" ON public.password_reset_requests;
CREATE POLICY "password_resets: public insert" ON public.password_reset_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "password_resets: admin all" ON public.password_reset_requests;
CREATE POLICY "password_resets: admin all" ON public.password_reset_requests
  FOR ALL USING (current_user_role() = 'admin');

-- KB Reviews for course completion gating
CREATE TABLE IF NOT EXISTS public.kb_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('faq', 'objection', 'voice_note')),
  content_id uuid NOT NULL,
  reviewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

ALTER TABLE public.kb_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kb_reviews: user own" ON public.kb_reviews;
CREATE POLICY "kb_reviews: user own" ON public.kb_reviews
  FOR ALL USING (user_id = auth.uid());
