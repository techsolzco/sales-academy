-- ============================================================
--  Migration 038: Missing UPDATE policies (audit S16)
--  Fixes: supabase/migrations/007_phase7.sql (quiz_attempts)
--  and 006_phase6.sql (conversations, direct_messages).
--
--  PROBLEM: these tables had SELECT/INSERT but NO UPDATE policy,
--  so legitimate anon-client updates always failed RLS:
--  - quiz_attempts: approveQuizAttempt / rejectQuizAttempt
--    (lib/actions/quiz-approval.ts:15-44, admin-checked in code
--    but using the anon client) could never work live.
--  - direct_messages: markMessagesRead (lib/actions/chat.ts:126-138)
--    could never mark messages read.
--  - conversations: sendMessage's last_message_at update
--    (lib/actions/chat.ts:99-103) always failed (silently ignored).
--
--  FIX: three narrow UPDATE policies below. DROP IF EXISTS first
--  so re-running this file is safe.
--
--  LIMITATION (Postgres RLS has no per-column UPDATE policy):
--  - direct_messages: the policy scopes to participants updating
--    messages they did NOT send, and the new row must have
--    read = true, but it cannot prevent a participant from ALSO
--    changing `content` in the same UPDATE. Same for
--    conversations: a participant could in theory change columns
--    other than last_message_at. If strict column-level enforcement
--    is needed, add a BEFORE UPDATE trigger that rejects changes
--    to any column except the intended one(s) — that is follow-up
--    work, not done here.
-- ============================================================

-- 1. quiz_attempts — admin-only UPDATE.
--    quiz-approval.ts updates approval_status / admin_notes
--    (columns added in 017_phase17.sql) via the anon client after
--    its requireAdmin() code check; this policy is what lets it
--    pass RLS. Non-admins cannot update attempts at all.
drop policy if exists "Admins UPDATE quiz_attempts" on public.quiz_attempts;
create policy "Admins UPDATE quiz_attempts"
  on public.quiz_attempts for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- 2. direct_messages — a participant may mark messages READ that
--    were sent by the OTHER participant (their own messages are
--    excluded, matching markMessagesRead's .neq('sender_id', user)).
--    The new row must still be unread-by-sender / read = true.
drop policy if exists "Users UPDATE read status in own conversations"
  on public.direct_messages;
create policy "Users UPDATE read status in own conversations"
  on public.direct_messages for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and conversation_id in (
      select id from public.conversations
      where participant_a = auth.uid() or participant_b = auth.uid()
    )
  )
  with check (
    read = true
    and sender_id <> auth.uid()
    and conversation_id in (
      select id from public.conversations
      where participant_a = auth.uid() or participant_b = auth.uid()
    )
  );

-- 3. conversations — a participant may update their own
--    conversation (covers sendMessage's last_message_at bump).
--    See LIMITATION above: column-level restriction needs a
--    trigger; this policy scopes by participation only.
drop policy if exists "Users UPDATE own conversations" on public.conversations;
create policy "Users UPDATE own conversations"
  on public.conversations for update
  to authenticated
  using (participant_a = auth.uid() or participant_b = auth.uid())
  with check (participant_a = auth.uid() or participant_b = auth.uid());
