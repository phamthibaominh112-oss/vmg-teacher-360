# VMG Teacher 360 — Full-stack manual deployment

This package contains both the **frontend application** and the **backend definition**. Nothing in the package requires the original demo accounts.

## Architecture

- **Web app:** Next.js App Router, deploy to Vercel.
- **Auth + database + file storage:** Supabase.
- **Backend APIs:** Next.js server routes for privileged actions such as account creation.
- **Database security:** Supabase Row Level Security (RLS), including region-aware teacher visibility.
- **Scheduled reminders:** Supabase Edge Function + Supabase Cron.
- **Email:** optional Resend integration. In-app notifications work without Resend.
- **Resource Center:** 109 source hyperlinks from the supplied VMG Teacher Resource Command Center are included both as a frontend fallback and a database seed.

---

## Phase 1 — Create Supabase manually

1. In Supabase, create a new project named `VMG Teacher 360`.
2. Keep the database password somewhere secure.
3. Open **SQL Editor**.
4. Run this file once:

```text
supabase/INSTALL_ALL.sql
```

That file installs the production schema and seeds the complete VMG academic resource catalogue.

If you prefer migrations instead, run in order:

```text
supabase/migrations/202608170001_initial_schema.sql
supabase/migrations/202608170002_seed_resource_catalogue.sql
```

The schema creates all role, portfolio, observation, case, training, HR-document, KPI, support, notification and audit tables plus Storage buckets and RLS policies.

---

## Phase 2 — Create the first R&D/BOD account manually

1. Supabase → Authentication → Users → create your first user.
2. Run the template in:

```text
manual/FIRST_ADMIN.sql
```

Replace the email and profile values first.

After this first privileged account exists, R&D/BOD can create additional accounts from **User & Access** inside the app. The client never receives the Supabase service-role key.

---

## Phase 3 — Configure the web app

Copy:

```bash
cp .env.example .env.local
```

Fill these values from the Supabase project:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

Optional email values:

```text
RESEND_API_KEY
REMINDER_FROM_EMAIL
```

Important: `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only. Never rename it to a `NEXT_PUBLIC_...` variable.

---

## Phase 4 — Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Test at least one account per role before production rollout.

---

## Phase 5 — Deploy frontend + server routes to Vercel

### Option A — Git repository

1. Push this whole folder to GitHub/GitLab/Bitbucket.
2. Vercel → Add New → Project → import repository.
3. Framework: Next.js (auto-detected).
4. Add the environment variables from `.env.example`.
5. Deploy.

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel
vercel --prod
```

Then add the same secrets in Vercel Project Settings → Environment Variables and redeploy if needed.

---

## Phase 6 — Deploy the reminder backend

The application works without this phase, but automatic T−24h email/in-app reminder processing requires it.

Install/login to Supabase CLI, then from the package root:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy reminders
```

Set secrets:

```bash
supabase secrets set REMINDER_CRON_SECRET='REPLACE_WITH_LONG_RANDOM_SECRET'
supabase secrets set RESEND_API_KEY='YOUR_KEY'                  # optional
supabase secrets set REMINDER_FROM_EMAIL='VMG Teacher 360 <notifications@yourdomain.com>'
```

In Supabase Vault create:

```text
project_url = https://YOUR_PROJECT_REF.supabase.co
reminder_cron_secret = the same REMINDER_CRON_SECRET
```

Then run:

```text
supabase/cron.sql
```

The job runs hourly and handles:

- T−24h training reminders.
- T−24h catch-up / retraining / teacher-meeting reminders.
- Teachers below the 2-touchpoint weekly standard.
- Approaching/overdue HR document promise dates.
- Email delivery for queued in-app notifications.

If Resend is not configured, in-app notifications still continue to work.

---

## Phase 7 — Production checks

Use `UAT_CHECKLIST.md` before opening the system to all staff.

Minimum checks:

- Teacher sees only own governed records.
- CMO/Centre Director cross-view only within their region.
- CSR/AS/PTNS see the intended organisation scope.
- R&D/BOD see full scope.
- Only R&D/BOD can delete governed records.
- Incident approval creates stakeholder + teacher notifications.
- AS observation saves criterion evidence and updates the teacher portfolio.
- Resource Center returns all 109 original hyperlinks.
- Teacher Support requests route to the appropriate team.
- Files in teacher evidence/documents buckets respect user scope.
- EN/VI switch is usable; English remains the teacher default.

