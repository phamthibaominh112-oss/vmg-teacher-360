-- Run after deploying the reminders Edge Function and setting its secrets.
-- In Supabase Vault, create these secrets first:
-- 1) project_url = https://YOUR_PROJECT.supabase.co
-- 2) reminder_cron_secret = the same REMINDER_CRON_SECRET configured for the function

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'vmg-teacher-360-t24-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='project_url') || '/functions/v1/reminders',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='reminder_cron_secret')
    ),
    body := jsonb_build_object('source','supabase-cron'),
    timeout_milliseconds := 10000
  );
  $$
);
