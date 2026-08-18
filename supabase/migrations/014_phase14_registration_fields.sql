-- Phase 14: Registration fields + social links
-- Run this in Supabase SQL Editor

-- 1. Add social/avatar fields to enrollment_applications
ALTER TABLE public.enrollment_applications
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS linkedin text;

-- 2. Add social fields to profiles (to carry over on approval)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS linkedin text;
