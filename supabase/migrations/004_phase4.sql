-- Phase 4: Enrollments, Notifications, Badges, Community, and Preferences

-- 1. Enrollment Applications
CREATE TABLE IF NOT EXISTS enrollment_applications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text,
    knowledge_level text CHECK (knowledge_level IN ('beginner', 'intermediate', 'advanced')),
    desired_course text,
    reason text,
    prior_experience text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text,
    type text DEFAULT 'info' CHECK (type IN ('info', 'enrollment', 'badge', 'community', 'system')),
    link text,
    read boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 3. Badges
CREATE TABLE IF NOT EXISTS badges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    icon text NOT NULL,
    criteria_description text,
    created_at timestamptz DEFAULT now()
);

-- 4. User Badges
CREATE TABLE IF NOT EXISTS user_badges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at timestamptz DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- 5. Community Posts
CREATE TABLE IF NOT EXISTS community_posts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    post_type text NOT NULL DEFAULT 'general' CHECK (post_type IN ('general', 'assignment_update', 'announcement')),
    is_pinned boolean NOT NULL DEFAULT false,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. Community Replies
CREATE TABLE IF NOT EXISTS community_replies (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 7. User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ur')),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE enrollment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Storage Buckets: avatars (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policies

-- enrollment_applications
CREATE POLICY "Anyone can INSERT (public signup)" 
ON enrollment_applications FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Admin can SELECT all enrollment_applications" 
ON enrollment_applications FOR SELECT 
TO authenticated 
USING (current_user_role() = 'admin');

CREATE POLICY "Applicant can SELECT own" 
ON enrollment_applications FOR SELECT 
TO public 
USING (email = auth.email());

CREATE POLICY "Admin can UPDATE enrollment_applications" 
ON enrollment_applications FOR UPDATE 
TO authenticated 
USING (current_user_role() = 'admin');

-- notifications
CREATE POLICY "Users SELECT own or admin SELECT all notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  current_user_role() = 'admin'
  OR user_id = auth.uid()
  OR user_id IS NULL
);

CREATE POLICY "Authenticated INSERT notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users UPDATE own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR current_user_role() = 'admin');

-- badges
CREATE POLICY "Anyone authenticated can SELECT badges" 
ON badges FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admin can INSERT badges" 
ON badges FOR INSERT 
TO authenticated 
WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "Admin can UPDATE badges" 
ON badges FOR UPDATE 
TO authenticated 
USING (current_user_role() = 'admin');

CREATE POLICY "Admin can DELETE badges" 
ON badges FOR DELETE 
TO authenticated 
USING (current_user_role() = 'admin');

-- user_badges
CREATE POLICY "Users SELECT own user_badges" 
ON user_badges FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Admins SELECT all user_badges" 
ON user_badges FOR SELECT 
TO authenticated 
USING (current_user_role() = 'admin');

CREATE POLICY "Service role/Auth INSERT user_badges" 
ON user_badges FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid() OR current_user_role() = 'admin');

-- community_posts
CREATE POLICY "Authenticated users can SELECT community_posts" 
ON community_posts FOR SELECT 
TO authenticated 
USING (is_deleted = false OR current_user_role() = 'admin');

CREATE POLICY "Authenticated users INSERT own posts" 
ON community_posts FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users UPDATE own posts or Admin UPDATE any" 
ON community_posts FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid() OR current_user_role() = 'admin');

-- community_replies
CREATE POLICY "Authenticated users can SELECT community_replies" 
ON community_replies FOR SELECT 
TO authenticated 
USING (is_deleted = false OR current_user_role() = 'admin');

CREATE POLICY "Authenticated users INSERT own replies" 
ON community_replies FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users UPDATE own replies or Admin UPDATE any" 
ON community_replies FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid() OR current_user_role() = 'admin');

-- user_preferences
CREATE POLICY "Users SELECT own preferences" 
ON user_preferences FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users INSERT own preferences" 
ON user_preferences FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users UPDATE own preferences" 
ON user_preferences FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- Pre-seed Badges
INSERT INTO badges (slug, name, icon, description, criteria_description) VALUES
('first_lesson', 'First Step', '🎯', 'Completed your first lesson', 'Complete any lesson'),
('first_course', 'Course Champion', '🏆', 'Completed your first full course', 'Complete all lessons in a course'),
('five_courses', 'Sales Master', '⭐', 'Completed 5 courses', 'Complete 5 different courses'),
('first_script_copy', 'Script Ready', '📋', 'Copied your first sales script', 'Copy any sales script'),
('first_post', 'Community Voice', '💬', 'Made your first community post', 'Post in the community discussion')
ON CONFLICT (slug) DO NOTHING;

-- Realtime Configuration
ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE community_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
