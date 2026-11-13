-- Attendance tracking for meetings (audit §3 #3).
-- Extends the existing public.meeting_invitees table (008_phase8.sql)
-- with a per-invitee attendance status + timestamp.
alter table public.meeting_invitees
  add column if not exists attendance text not null default 'pending'
  check (attendance in ('pending', 'present', 'absent', 'late'));

alter table public.meeting_invitees
  add column if not exists attendance_marked_at timestamptz;

-- No new UPDATE policy is needed: 008_phase8.sql already grants admins
-- FOR ALL on meeting_invitees ("Admin ALL meeting_invitees"), which covers
-- UPDATE. Non-admins keep SELECT-only access to their own row
-- ("Users SELECT own meeting_invitees"), so attendance can only be marked
-- through the admin-gated markAttendance server action.

create index if not exists meeting_invitees_attendance_idx
  on public.meeting_invitees (meeting_id, attendance);
