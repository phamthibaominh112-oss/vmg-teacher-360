# Backend overview

## Identity and access

Supabase Auth owns identity. `public.profiles` stores VMG role, centre, region, teacher code, professional level and language preference.

Roles:

- teacher
- cmo
- centre_director
- csr
- rnd
- bod
- academic_supervisor
- ptns

Deletion authority is restricted to `rnd` and `bod` through RLS.

## Main data domains

- `profiles` — user/teacher identity and organisational scope.
- `academic_resources` — complete Resource Center catalogue.
- `announcements` — internal bulletin board.
- `trainings`, `training_registrations`, `training_requests` — development calendar and bookings.
- `teacher_events` — catch-up, retraining and teacher meetings.
- `observations` — official rubric, evidence, feedback, SMART action and re-observation date.
- `incidents` — teacher cases, evidence, Centre Director approval and 12-hour delivery SLA.
- `teacher_touchpoints` — weekly 2-touchpoint control.
- `teacher_documents` — degree/TESOL/English/native-proof readiness and promise dates.
- `teacher_kpi_snapshots` — observation/HVR/revenue KPI snapshots.
- `upgrade_recommendations` — AS/R&D level-up workflow.
- `support_requests` — teacher help/resource/coaching/coordination requests.
- `notifications`, `reminder_log` — in-app and scheduled reminder infrastructure.
- `audit_events` — auditable changes to governed records.

## Storage buckets

- `teacher-evidence`
- `teacher-documents`
- `training-materials`

Teacher-specific evidence/document paths use the teacher UUID as the first folder segment. RLS limits teacher access to their own folder while authorised staff can access their operational scope.

## Server-side privileged operations

`src/app/api/admin/users/route.js` creates Supabase Auth users using the service-role key after confirming the requester is R&D/BOD. The service-role key is never exposed to the browser.

## Reminder engine

`supabase/functions/reminders/index.ts` is the recommended hourly worker. `src/app/api/cron/reminders/route.js` is included as an optional web-backend fallback.
