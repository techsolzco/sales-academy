-- ============================================================
-- Migration 023: Theme Packs -- gradient, galaxy, wallpaper
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Add new columns to theme_settings
ALTER TABLE public.theme_settings
  ADD COLUMN IF NOT EXISTS theme_preset         text DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS gradient_css         text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sidebar_gradient_css text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wallpaper_url        text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wallpaper_opacity    numeric DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS card_opacity         numeric DEFAULT 1.0;

-- 2. Create the storage bucket for wallpaper uploads (public reads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('theme-wallpapers', 'theme-wallpapers', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for the bucket (use DO block to avoid duplicate errors)
DO $$ BEGIN
  CREATE POLICY "Public read theme wallpapers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'theme-wallpapers');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin upload theme wallpapers"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'theme-wallpapers');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin delete theme wallpapers"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'theme-wallpapers');
EXCEPTION WHEN duplicate_object THEN null; END $$;
