-- Phase 7: Assignments and Quizzes

-- 1a. Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  instructions text NOT NULL,
  due_date timestamptz,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_text text,
  file_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  feedback text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(assignment_id, user_id)
);

-- Storage bucket (idempotent insert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  CREATE POLICY "assignment files: auth upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assignment-files' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "assignment files: read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assignment-files' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR current_user_role() = 'admin'
  ));
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated SELECT all assignments" ON assignments FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin INSERT assignments" ON assignments FOR INSERT TO authenticated WITH CHECK (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin UPDATE assignments" ON assignments FOR UPDATE TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin DELETE assignments" ON assignments FOR DELETE TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- Submissions RLS
DO $$ BEGIN
  CREATE POLICY "Users SELECT own assignment_submissions" ON assignment_submissions FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users INSERT own assignment_submissions" ON assignment_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users UPDATE own pending assignment_submissions" ON assignment_submissions FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins SELECT all assignment_submissions" ON assignment_submissions FOR SELECT TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins UPDATE all assignment_submissions" ON assignment_submissions FOR UPDATE TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 1b. Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  pass_score integer NOT NULL DEFAULT 70 CHECK (pass_score BETWEEN 0 AND 100),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  points integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_options (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score numeric(6,2) NOT NULL DEFAULT 0,
  max_score numeric(6,2) NOT NULL DEFAULT 0,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  completed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id uuid NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES quiz_options(id) ON DELETE SET NULL,
  is_correct boolean NOT NULL DEFAULT false
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

-- Quizzes RLS
DO $$ BEGIN
  CREATE POLICY "Authenticated SELECT all quizzes" ON quizzes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin INSERT quizzes" ON quizzes FOR INSERT TO authenticated WITH CHECK (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin UPDATE quizzes" ON quizzes FOR UPDATE TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin DELETE quizzes" ON quizzes FOR DELETE TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Quiz Questions RLS
DO $$ BEGIN
  CREATE POLICY "Authenticated SELECT all quiz_questions" ON quiz_questions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin INSERT quiz_questions" ON quiz_questions FOR INSERT TO authenticated WITH CHECK (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin UPDATE quiz_questions" ON quiz_questions FOR UPDATE TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin DELETE quiz_questions" ON quiz_questions FOR DELETE TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Quiz Options RLS
DO $$ BEGIN
  CREATE POLICY "Authenticated SELECT all quiz_options" ON quiz_options FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin INSERT quiz_options" ON quiz_options FOR INSERT TO authenticated WITH CHECK (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin UPDATE quiz_options" ON quiz_options FOR UPDATE TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin DELETE quiz_options" ON quiz_options FOR DELETE TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Quiz Attempts RLS
DO $$ BEGIN
  CREATE POLICY "Users SELECT own quiz_attempts" ON quiz_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users INSERT own quiz_attempts" ON quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins SELECT all quiz_attempts" ON quiz_attempts FOR SELECT TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Quiz Attempt Answers RLS
DO $$ BEGIN
  CREATE POLICY "Users SELECT own quiz_attempt_answers" ON quiz_attempt_answers FOR SELECT TO authenticated USING (attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users INSERT own quiz_attempt_answers" ON quiz_attempt_answers FOR INSERT TO authenticated WITH CHECK (attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins SELECT all quiz_attempt_answers" ON quiz_attempt_answers FOR SELECT TO authenticated USING (current_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;
