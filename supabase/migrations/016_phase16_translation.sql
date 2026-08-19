-- Migration 016: Add translation columns for KB items

ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS question_translated text;
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS short_answer_translated text;
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS customer_ready_answer_translated text;

ALTER TABLE public.objections ADD COLUMN IF NOT EXISTS recommended_response_translated text;

ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS content_translated text;

ALTER TABLE public.voice_notes ADD COLUMN IF NOT EXISTS transcript_translated text;
