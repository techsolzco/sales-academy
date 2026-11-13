-- Scheduled announcements (audit §3 #18): allow an announcement to be
-- published at a future time and/or expire automatically.
-- Staff-facing fetches only show an announcement while it is inside its
-- window: is_published = true AND (publish_at IS NULL OR publish_at <= now)
-- AND (expires_at IS NULL OR expires_at > now). Admin fetches return all
-- rows regardless of the window. RLS policies unchanged.
alter table public.announcements
  add column if not exists publish_at timestamptz;

alter table public.announcements
  add column if not exists expires_at timestamptz;
