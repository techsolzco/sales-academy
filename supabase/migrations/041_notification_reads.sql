-- Per-user read receipts for broadcast notifications (B8 real fix).
-- The notifications table has one shared `read` boolean, so a broadcast row
-- (user_id IS NULL) can never be marked read per-user. This table records
-- "user X read broadcast Y". Code in lib/actions/notifications.ts should
-- upsert here for broadcast rows (and NotificationBell's localStorage
-- overlay can be removed once that lands).
create table if not exists public.notification_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.notification_reads enable row level security;

create policy "Users SELECT own notification_reads"
  on public.notification_reads for select to authenticated
  using (user_id = auth.uid() or current_user_role() = 'admin');

create policy "Users INSERT own notification_reads"
  on public.notification_reads for insert to authenticated
  with check (user_id = auth.uid() or current_user_role() = 'admin');

create index if not exists notification_reads_notification_idx
  on public.notification_reads (notification_id);
