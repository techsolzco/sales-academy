CREATE TABLE IF NOT EXISTS theme_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal text NOT NULL UNIQUE CHECK (portal IN ('admin', 'salesman')),
  primary_color text NOT NULL DEFAULT '#4F46E5',
  accent_color text NOT NULL DEFAULT '#10B981',
  theme_mode text NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('system', 'light', 'dark')),
  updated_at timestamptz DEFAULT now()
);

-- Insert default themes
INSERT INTO theme_settings (portal, primary_color, accent_color, theme_mode) VALUES 
('admin', '#4F46E5', '#10B981', 'system'),
('salesman', '#2563EB', '#059669', 'system')
ON CONFLICT (portal) DO NOTHING;

-- RLS
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin can full access themes" ON theme_settings FOR ALL TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Salesman can view salesman theme" ON theme_settings FOR SELECT TO authenticated USING (current_user_role() = 'salesman' AND portal = 'salesman');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can read all themes" ON theme_settings FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
