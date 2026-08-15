-- ============================================================
--  Sales Academy — Phase 10: AI Assistant System
--  Run in Supabase SQL Editor after 009_phase9.sql
--  Idempotent: safe to re-run even if objects already exist
-- ============================================================

-- ── 1. AI TRAINING SETTINGS (single-row config) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_training_settings (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  persona_instructions  text NOT NULL DEFAULT '',
  sales_style_rules     text NOT NULL DEFAULT '',
  locked_facts          text NOT NULL DEFAULT '',
  tone_examples         text NOT NULL DEFAULT '',
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ── 2. AI USAGE LOG ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature      text NOT NULL CHECK (feature IN ('ai_assist', 'quick_create', 'ask_ai', 'test_ai')),
  content_type text,
  instruction  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id   ON public.ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature    ON public.ai_usage_log(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage_log(created_at DESC);

-- ── 3. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.ai_training_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log         ENABLE ROW LEVEL SECURITY;

-- ai_training_settings: admin full access only
DROP POLICY IF EXISTS "ai_training: admin full access" ON public.ai_training_settings;
CREATE POLICY "ai_training: admin full access"
  ON public.ai_training_settings FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ai_usage_log: admin sees all; authenticated users insert own
DROP POLICY IF EXISTS "ai_usage_log: admin can read all" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log: admin can read all"
  ON public.ai_usage_log FOR SELECT
  USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "ai_usage_log: authenticated can insert own" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log: authenticated can insert own"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ── 4. SEED DEFAULT SETTINGS ROW ─────────────────────────────────────────
INSERT INTO public.ai_training_settings (
  persona_instructions,
  sales_style_rules,
  locked_facts,
  tone_examples
)
SELECT
  'You are an expert, top-performing sales representative for Google AI Pro subscriptions. You are warm, confident, patient, and never pushy. You build trust through transparency (never overpromise), handle objections calmly, and always guide the customer toward a clear next step (share email, make payment) without sounding salesy.',
  'Always address the customer as "sir". Keep messages short and natural — WhatsApp style, not corporate emails. Break long info into short sentences. Use Hinglish (Roman Urdu + English mix) naturally. Never use jargon the customer would not understand. If unsure, offer to clarify. Never create false urgency.',
  'LOCKED FACTS — never contradict or invent beyond these:
- Single User plan: Rs. 499 for 18 months
- Owner Account: Rs. 999 for 18 months, includes 5 additional Gmail member slots
- Veo 3 video generation: approximately 5 videos per day per eligible account — NOT guaranteed, subject to Google''s current limits
- Google Flow Credits: 1,000 per month TOTAL for the Owner Account — does NOT multiply with more Gmail accounts
- Payment policy: advance payment is standard; voucher-first can be considered if the customer has prior deal proof
- Service warranty: we will not remove the customer''s access ourselves for 18 months, but we are NOT responsible for Google''s own policy changes, restrictions, or access termination
- Voucher guarantee: if a voucher fails to claim, shows expired, or has a technical issue, we guarantee a replacement voucher
- Activation time: 5–15 minutes after payment and email sharing',
  'Example tone — First contact:
"Assalam o Alaikum sir, umeed hai aap theek hain. Google AI Pro ka plan 18 months ke liye available hai. Single User sirf Rs. 499 mein. Koi sawal ho to zaroor poochen."

Example tone — Objection response:
"Samajh sakta hoon sir. Ye accounts hamare paas kafi stable hain. Aur voucher issue ho to replacement guaranteed hai hamari taraf se."

Example tone — Closing:
"Perfect sir! Payment ke baad apni email share karen, 5-15 minute mein access active ho jayega. Shukriya!"'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_training_settings);
