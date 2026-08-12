-- 1. Add qualifying_for_reseller to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS qualifying_for_reseller boolean NOT NULL DEFAULT false;

-- 2. Add is_reseller and sales_portal_url to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_reseller boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sales_portal_url text;

-- 3. reseller_applications table
CREATE TABLE IF NOT EXISTS reseller_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  rejection_reason text,
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(user_id)  -- one active application per user
);

-- 4. commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- Enable RLS
ALTER TABLE reseller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- RLS: reseller_applications
-- Users can view their own application
CREATE POLICY "Users view own reseller application"
ON reseller_applications FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can INSERT their own application (once)
CREATE POLICY "Users insert own reseller application"
ON reseller_applications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can SELECT all
CREATE POLICY "Admins view all reseller applications"
ON reseller_applications FOR SELECT TO authenticated
USING (current_user_role() = 'admin');

-- Admins can UPDATE (approve/reject)
CREATE POLICY "Admins update reseller applications"
ON reseller_applications FOR UPDATE TO authenticated
USING (current_user_role() = 'admin');

-- RLS: commissions
CREATE POLICY "Resellers view own commissions"
ON commissions FOR SELECT TO authenticated
USING (reseller_id = auth.uid());

CREATE POLICY "Admins manage all commissions"
ON commissions FOR ALL TO authenticated
USING (current_user_role() = 'admin')
WITH CHECK (current_user_role() = 'admin');

-- Enable realtime for reseller_applications
ALTER PUBLICATION supabase_realtime ADD TABLE reseller_applications;
