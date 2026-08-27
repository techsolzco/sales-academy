-- =============================================================
--  Sales Academy — Migration 027: Performance Indexes
--  Adds compound and partial indexes for the most common
--  query patterns across FAQs, scripts, objections,
--  assignments, quiz_attempts, and tools.
-- =============================================================

-- FAQs: WHERE tool_id = X AND deleted_at IS NULL AND status = 'published'
CREATE INDEX IF NOT EXISTS idx_faqs_tool_status
  ON public.faqs(tool_id, status) WHERE deleted_at IS NULL;

-- Scripts: same pattern
CREATE INDEX IF NOT EXISTS idx_scripts_tool_status
  ON public.scripts(tool_id, status) WHERE deleted_at IS NULL;

-- Objections: same pattern
CREATE INDEX IF NOT EXISTS idx_objections_tool_status
  ON public.objections(tool_id, status) WHERE deleted_at IS NULL;

-- Assignment submissions: badge count query + per-assignment lookup
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status
  ON public.assignment_submissions(status);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_status
  ON public.assignment_submissions(assignment_id, status);

-- Quiz attempts: per-quiz and per-user lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id
  ON public.quiz_attempts(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user
  ON public.quiz_attempts(quiz_id, user_id);

-- Quiz attempt answers: per-attempt lookup
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt
  ON public.quiz_attempt_answers(attempt_id);

-- Tools: status + deleted filter (tools list page)
CREATE INDEX IF NOT EXISTS idx_tools_status_active
  ON public.tools(status) WHERE deleted_at IS NULL;

-- Assignments: tool_id and deleted_at (common filter in assignment lists)
CREATE INDEX IF NOT EXISTS idx_assignments_tool_active
  ON public.assignments(tool_id) WHERE deleted_at IS NULL;

-- Assignment content items: lookup by assignment
CREATE INDEX IF NOT EXISTS idx_assignment_content_items_assignment
  ON public.assignment_content_items(assignment_id);

-- Daily assignment runs: per-user, per-date dedup
CREATE INDEX IF NOT EXISTS idx_daily_runs_user_date
  ON public.daily_assignment_runs(user_id, run_date);

-- Assignment rules: per-tool lookup
CREATE INDEX IF NOT EXISTS idx_assignment_rules_tool_enabled
  ON public.assignment_rules(tool_id) WHERE enabled = true;

-- Verify — should show all 13 new indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_faqs_tool_status',
    'idx_scripts_tool_status',
    'idx_objections_tool_status',
    'idx_assignment_submissions_status',
    'idx_assignment_submissions_assignment_status',
    'idx_quiz_attempts_quiz_id',
    'idx_quiz_attempts_quiz_user',
    'idx_quiz_attempt_answers_attempt',
    'idx_tools_status_active',
    'idx_assignments_tool_active',
    'idx_assignment_content_items_assignment',
    'idx_daily_runs_user_date',
    'idx_assignment_rules_tool_enabled'
  )
ORDER BY tablename, indexname;
