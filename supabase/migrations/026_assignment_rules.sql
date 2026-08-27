-- =============================================================
--  Sales Academy — Migration 026: Auto-Assignment Rule Engine
--  Creates:
--    assignment_rules         — per-tool daily content config
--    assignment_rule_users    — specific salesmen for a rule
--    salesman_tool_expertise  — expert flag (excluded from rules)
--    daily_assignment_runs    — dedup guard (one run per user/day)
-- =============================================================

-- 1. assignment_rules
CREATE TABLE IF NOT EXISTS public.assignment_rules (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id        uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  daily_faqs     integer NOT NULL DEFAULT 0 CHECK (daily_faqs >= 0),
  daily_scripts  integer NOT NULL DEFAULT 0 CHECK (daily_scripts >= 0),
  daily_objections integer NOT NULL DEFAULT 0 CHECK (daily_objections >= 0),
  applies_to     text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'specific')),
  enabled        boolean NOT NULL DEFAULT true,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tool_id)
);

-- 2. assignment_rule_users (which salesmen a rule targets when applies_to = 'specific')
CREATE TABLE IF NOT EXISTS public.assignment_rule_users (
  id       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id  uuid NOT NULL REFERENCES public.assignment_rules(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(rule_id, user_id)
);

-- 3. salesman_tool_expertise (experts skip auto-assignments for that tool)
CREATE TABLE IF NOT EXISTS public.salesman_tool_expertise (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tool_id    uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  marked_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  marked_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tool_id)
);

-- 4. daily_assignment_runs (dedup: one auto-generation per user per day)
CREATE TABLE IF NOT EXISTS public.daily_assignment_runs (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_date   date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, run_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignment_rules_tool   ON public.assignment_rules(tool_id);
CREATE INDEX IF NOT EXISTS idx_rule_users_rule         ON public.assignment_rule_users(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_users_user         ON public.assignment_rule_users(user_id);
CREATE INDEX IF NOT EXISTS idx_expertise_user          ON public.salesman_tool_expertise(user_id);
CREATE INDEX IF NOT EXISTS idx_expertise_tool          ON public.salesman_tool_expertise(tool_id);
CREATE INDEX IF NOT EXISTS idx_daily_runs_user_date    ON public.daily_assignment_runs(user_id, run_date);

-- RLS
ALTER TABLE public.assignment_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rule_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salesman_tool_expertise  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_assignment_runs    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage assignment_rules"
    ON public.assignment_rules FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage assignment_rule_users"
    ON public.assignment_rule_users FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage salesman_tool_expertise"
    ON public.salesman_tool_expertise FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own daily_assignment_runs"
    ON public.daily_assignment_runs FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins read daily_assignment_runs"
    ON public.daily_assignment_runs FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;
