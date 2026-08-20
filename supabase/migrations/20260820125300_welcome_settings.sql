-- Create general app settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  welcome_message_template text NOT NULL DEFAULT 'Welcome {name}! We are excited to have you join the Sales Academy.',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings: admin full access" ON public.app_settings;
CREATE POLICY "app_settings: admin full access"
  ON public.app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "app_settings: all auth read" ON public.app_settings;
CREATE POLICY "app_settings: all auth read"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Insert default row
INSERT INTO public.app_settings (welcome_message_template)
SELECT 'Welcome {name}! We are excited to have you join the Sales Academy.'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Track if user has seen welcome message
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_welcome boolean DEFAULT false;
