# VMG Teacher 360 · V11 Readable + Connected

## What changed
- Larger, friendlier typography and higher-contrast body/table/form text.
- Notification bell + in-app inbox with unread count and mark-as-read flow.
- Announcements appear on role dashboards as a compact weekly update strip.
- Teachers can upload their own professional documents; PTNS receives a review inbox automatically.
- PTNS can verify a document or request revision; the teacher is notified in-app.
- Every user can upload a profile photo.
- Observation results, KPI snapshots, approved cases, trainings, teacher events, announcements and upgrade decisions route notifications to the relevant teacher / centre / region / HO roles.
- Immediate email flush endpoint added. Email delivery uses RESEND_API_KEY and REMINDER_FROM_EMAIL if configured.

## Deploy order
1. Supabase SQL Editor → run `supabase/V11_READABLE_CONNECTED.sql` once.
2. Upload/replace the V11 patch files in the existing GitHub repo.
3. Let Vercel redeploy production.
4. For email delivery, set `RESEND_API_KEY` and `REMINDER_FROM_EMAIL` in Vercel. In-app notifications work even without email configuration.

## Do not rerun
Do not rerun INSTALL_ALL.sql or V10 migration on an existing production database.
