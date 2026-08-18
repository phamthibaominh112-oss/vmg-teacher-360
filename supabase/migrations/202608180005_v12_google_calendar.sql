-- VMG Teacher 360 V12 · Google Calendar sync metadata
-- Run once AFTER V11_READABLE_CONNECTED.sql.
-- No Google credentials are stored in Supabase. Credentials live only in Vercel server environment variables.

begin;

alter table public.training_registrations
  add column if not exists calendar_sync_status text not null default 'pending',
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_link text,
  add column if not exists calendar_synced_at timestamptz,
  add column if not exists calendar_sync_error text;

alter table public.teacher_events
  add column if not exists calendar_sync_status text not null default 'pending',
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_link text,
  add column if not exists calendar_synced_at timestamptz,
  add column if not exists calendar_sync_error text;

create index if not exists training_registrations_calendar_sync_idx
  on public.training_registrations(calendar_sync_status,booked_at desc);
create index if not exists teacher_events_calendar_sync_idx
  on public.teacher_events(calendar_sync_status,starts_at);

-- Keep statuses readable and self-healing for old rows.
update public.training_registrations set calendar_sync_status='pending' where calendar_sync_status is null;
update public.teacher_events set calendar_sync_status='pending' where calendar_sync_status is null;

commit;
