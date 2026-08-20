-- ============================================================
-- Migration 018: Admin audit logs table for View-As-Student feature
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_name text,
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_name text,
  details text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aal: admin read" ON public.admin_audit_logs;
CREATE POLICY "aal: admin read" ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "aal: admin insert" ON public.admin_audit_logs;
CREATE POLICY "aal: admin insert" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_id_idx ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON public.admin_audit_logs(created_at DESC);
