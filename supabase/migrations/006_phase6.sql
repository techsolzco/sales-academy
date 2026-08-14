-- Phase 6: Leaderboard, Support Tickets, and Chat

-- 1a. Leaderboard — database function
-- Leaderboard scoring weights (edit here to adjust formula)
-- courseCompleted=300pts, lessonCompleted=10pts, scriptCopied=50pts
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  courses_completed bigint,
  lessons_completed bigint,
  scripts_copied bigint,
  score bigint
) LANGUAGE sql STABLE AS $$
  WITH 
  lesson_counts AS (
    SELECT user_id,
      COUNT(*) FILTER (WHERE completed = true) AS lessons_done
    FROM lesson_progress
    GROUP BY user_id
  ),
  course_counts AS (
    SELECT lp.user_id, COUNT(DISTINCT m.course_id) AS courses_done
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    JOIN modules m ON m.id = l.module_id
    WHERE lp.completed = true
    GROUP BY lp.user_id
  ),
  script_counts AS (
    SELECT user_id, COUNT(*) AS scripts_done
    FROM script_copies
    GROUP BY user_id
  )
  SELECT
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(cc.courses_done, 0) AS courses_completed,
    COALESCE(lc.lessons_done, 0) AS lessons_completed,
    COALESCE(sc.scripts_done, 0) AS scripts_copied,
    (
      COALESCE(cc.courses_done, 0) * 300 +
      COALESCE(lc.lessons_done, 0) * 10 +
      COALESCE(sc.scripts_done, 0) * 50
    ) AS score
  FROM profiles p
  LEFT JOIN lesson_counts lc ON lc.user_id = p.id
  LEFT JOIN course_counts cc ON cc.user_id = p.id
  LEFT JOIN script_counts sc ON sc.user_id = p.id
  WHERE p.role IN ('salesman', 'student')
  ORDER BY score DESC;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard() TO authenticated;


-- 1b. Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'course', 'account', 'other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS for support_tickets
CREATE POLICY "Users SELECT own support_tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users INSERT own support_tickets"
ON support_tickets FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins SELECT all support_tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (current_user_role() = 'admin');

CREATE POLICY "Admins UPDATE all support_tickets"
ON support_tickets FOR UPDATE
TO authenticated
USING (current_user_role() = 'admin');

-- RLS for ticket_messages
CREATE POLICY "Users SELECT messages on own tickets"
ON ticket_messages FOR SELECT
TO authenticated
USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));

CREATE POLICY "Users INSERT messages on own tickets"
ON ticket_messages FOR INSERT
TO authenticated
WITH CHECK (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()) AND sender_id = auth.uid());

CREATE POLICY "Admins SELECT all ticket_messages"
ON ticket_messages FOR SELECT
TO authenticated
USING (current_user_role() = 'admin');

CREATE POLICY "Admins INSERT all ticket_messages"
ON ticket_messages FOR INSERT
TO authenticated
WITH CHECK (current_user_role() = 'admin' AND sender_id = auth.uid());


-- 1c. Conversations + Direct Messages
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_a, participant_b)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS for conversations
CREATE POLICY "Users SELECT own conversations"
ON conversations FOR SELECT
TO authenticated
USING (participant_a = auth.uid() OR participant_b = auth.uid());

CREATE POLICY "Users INSERT own conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (participant_a = auth.uid() OR participant_b = auth.uid());

CREATE POLICY "Admins SELECT all conversations"
ON conversations FOR SELECT
TO authenticated
USING (current_user_role() = 'admin');

-- RLS for direct_messages
CREATE POLICY "Users SELECT messages in own conversations"
ON direct_messages FOR SELECT
TO authenticated
USING (conversation_id IN (SELECT id FROM conversations WHERE participant_a = auth.uid() OR participant_b = auth.uid()));

CREATE POLICY "Users INSERT own messages"
ON direct_messages FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid() AND conversation_id IN (SELECT id FROM conversations WHERE participant_a = auth.uid() OR participant_b = auth.uid()));

CREATE POLICY "Admins SELECT all direct_messages"
ON direct_messages FOR SELECT
TO authenticated
USING (current_user_role() = 'admin');

CREATE POLICY "Admins INSERT all direct_messages"
ON direct_messages FOR INSERT
TO authenticated
WITH CHECK (current_user_role() = 'admin' AND sender_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
