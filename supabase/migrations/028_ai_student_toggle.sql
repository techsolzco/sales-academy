-- Migration 028: Add student AI access toggle
-- Run in Supabase SQL Editor

ALTER TABLE public.ai_training_settings
  ADD COLUMN IF NOT EXISTS student_ai_access_enabled boolean NOT NULL DEFAULT true;
