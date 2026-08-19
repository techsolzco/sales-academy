ALTER TABLE public.kb_reviews DROP CONSTRAINT IF EXISTS kb_reviews_content_type_check;
ALTER TABLE public.kb_reviews ADD CONSTRAINT kb_reviews_content_type_check CHECK (content_type IN ('faq', 'objection', 'voice_note', 'script'));
