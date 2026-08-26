-- ============================================================
-- Migration 023: Theme Packs — gradient, galaxy, wallpaper
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.theme_settings
  ADD COLUMN IF NOT EXISTS theme_preset       text DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS gradient_css       text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sidebar_gradient_css text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wallpaper_url      text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wallpaper_opacity  numeric DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS card_opacity       numeric DEFAULT 1.0;

-- Create the storage bucket for wallpaper uploads (public reads, admin writes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('theme-wallpapers', 'theme-wallpapers', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket
CREATE POLICY IF NOT EXISTS "Public read theme wallpapers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'theme-wallpapers');

CREATE POLICY IF NOT EXISTS "Admin upload theme wallpapers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'theme-wallpapers');

CREATE POLICY IF NOT EXISTS "Admin delete theme wallpapers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'theme-wallpapers');
