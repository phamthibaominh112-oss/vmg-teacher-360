# VMG Teacher 360 · V12 Google Calendar Sync

V12 adds automatic Google Calendar delivery for individual bookings.

## What syncs

1. A teacher books a training in Teacher 360 → the training is saved in `training_registrations` and Teacher 360 immediately attempts to place it on that teacher's Google Calendar.
2. AS / CMO / Centre Director / Regional Director / R&D / BOD books a teacher catch-up, retraining or performance meeting → the event is saved in `teacher_events` and Teacher 360 immediately attempts to place it on the selected teacher's Google Calendar.
3. If Google Calendar is unavailable, the Teacher 360 booking is NOT lost. The record remains saved with `pending` / `failed` sync status and the user can retry from the Calendar page.
4. Existing Teacher 360 T−24h in-app/email reminder logic remains unchanged. Google Calendar adds its own 24-hour and 30-minute popup reminders.

## Step 1 · Supabase migration

Run once in Supabase SQL Editor:

`supabase/V12_GOOGLE_CALENDAR.sql`

Do not rerun INSTALL_ALL.sql.

## Step 2 · Google Cloud / Workspace setup

Use a Google Cloud project controlled by VMG.

1. Enable **Google Calendar API**.
2. Create a **Service Account** and enable **Domain-wide Delegation** for it.
3. Download/create a service-account private key.
4. In Google Workspace Admin Console go to **Security → Access and data control → API Controls → Domain-wide delegation**.
5. Add the service account's **numeric Client ID**.
6. Grant only this OAuth scope:

`https://www.googleapis.com/auth/calendar.events`

For internal `@vmg.edu.vn` users, Teacher 360 can impersonate the booked user and create the event directly on their primary calendar. This is the default `auto` behaviour when `GOOGLE_WORKSPACE_DOMAIN=vmg.edu.vn`.

For an email outside the Workspace domain, V12 can fall back to creating the event from a VMG organizer account and inviting that email. Set `GOOGLE_CALENDAR_ORGANIZER_EMAIL` for this fallback.

## Step 3 · Vercel Environment Variables

Add these server-side variables to Production and Preview:

```text
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_CALENDAR_MODE=auto
GOOGLE_WORKSPACE_DOMAIN=vmg.edu.vn
GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL=teacher360-calendar@YOUR_GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
GOOGLE_CALENDAR_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_CALENDAR_ORGANIZER_EMAIL=YOUR_VMGCALENDAR_ORGANIZER@vmg.edu.vn
GOOGLE_CALENDAR_TIME_ZONE=Asia/Ho_Chi_Minh
```

Important:
- Keep `GOOGLE_CALENDAR_PRIVATE_KEY` secret. Never put it in frontend code or GitHub.
- The private key can be pasted in Vercel with real line breaks or with `\n`; the app supports both.
- `GOOGLE_CALENDAR_ORGANIZER_EMAIL` should be a real Google Workspace user that the service account is allowed to impersonate.

Then redeploy Production.

## User experience

Training page:
- Book → `Booked`
- `Google Calendar · Synced` when complete
- `Add to Calendar` / `Retry` if pending or failed

Calendar page:
- Each booked training / teacher event shows its Google Calendar sync status.
- A failed sync can be retried without recreating the Teacher 360 booking.

## Security model

Google credentials are read only by the Next.js server route `/api/calendar/sync`.
The browser never receives the private key or a Google access token.
The app uses the minimum Calendar event scope rather than broad Drive/Gmail access.
