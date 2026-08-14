-- Phase 8: Virtual Meetings

CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  room_name text NOT NULL UNIQUE,
  jitsi_url text NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'invited' CHECK (visibility IN ('public','invited')),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_invitees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_invitees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin ALL meetings" ON meetings FOR ALL TO authenticated USING (current_user_role() = 'admin') WITH CHECK (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated SELECT meetings" ON meetings FOR SELECT TO authenticated USING (
    visibility = 'public' 
    OR id IN (SELECT meeting_id FROM meeting_invitees WHERE user_id = auth.uid()) 
    OR created_by = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;


DO $$ BEGIN
  CREATE POLICY "Admin ALL meeting_invitees" ON meeting_invitees FOR ALL TO authenticated USING (current_user_role() = 'admin') WITH CHECK (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users SELECT own meeting_invitees" ON meeting_invitees FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
