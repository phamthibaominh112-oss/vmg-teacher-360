# VMG Teacher 360 — Full-stack production package

VMG Teacher 360 is a role-based teacher excellence, development, resource, performance and governance platform for VMG English.

This repository is the **full deployment package**, not a static mockup. It includes the web frontend, authenticated backend routes, Supabase database schema, Row Level Security, Storage policies, full Resource Center seed, reminder Edge Function and manual deployment guides.

## Start here

**Manual deployment:** [`MANUAL_DEPLOY.md`](./MANUAL_DEPLOY.md)

Other references:

- [`BACKEND_OVERVIEW.md`](./BACKEND_OVERVIEW.md)
- [`ROLE_MATRIX.md`](./ROLE_MATRIX.md)
- [`UAT_CHECKLIST.md`](./UAT_CHECKLIST.md)
- [`manual/FIRST_ADMIN.sql`](./manual/FIRST_ADMIN.sql)

## Included production layers

### Frontend

- VMG visual identity: red / wine / gold / warm neutral system.
- Montserrat throughout the interface.
- English-first teacher experience with EN/VI switch.
- Role-aware sidebar/navigation.
- Teacher My Hub.
- Evidence-led Teaching Portfolio.
- Capability / Strength / Growth Matrix.
- Observation & Feedback history.
- Training & Calendar.
- Full Resource Center with **109 original source hyperlinks**.
- Announcements.
- Teacher document readiness.
- Support & Feedback routing.
- Management views for teachers, performance, incidents, touchpoints, upgrades, KPI, documents, governance and access.

### Backend

- Supabase Auth.
- Postgres schema + RLS.
- Region-aware access for CMO/Centre Director.
- R&D/BOD-only delete authority.
- Private evidence/document Storage buckets.
- Admin user-creation API using server-side service-role credentials.
- Incident approval/notification workflow.
- Training/catch-up/calendar workflows.
- Support-request routing.
- Audit log.
- Hourly reminder Edge Function.
- Optional Resend email delivery.

## Resource Center

The package includes the full supplied VMG Teacher Resource Command Center catalogue in two places:

1. `src/data/resources.json` — frontend fallback so the catalogue remains visible even before database seeding.
2. `supabase/seed_resources.sql` — inserts all 109 resources into `academic_resources` for production data management.

## Observation framework

The official observation implementation follows the supplied VMG Performance Tracker structure:

- Preparation — 10%
- Teaching Methodology & Skills — 45%
- Classroom Management — 45%
- Criterion rating scale — 1 to 4

The teacher Growth Matrix derives development lenses from criterion-level evidence rather than using a single overall score only.

## Regional structure

- Region 1: PVT · VTS · NKN · TBM
- Region 2: LDN · HVG · TPU · NTI · PTA
- Region 3: BPC

CMO/Centre Director visibility across borrowed teachers within the same region is enforced in database RLS.

## No embedded demo credentials

The login screen does not expose demo accounts. If UAT accounts are needed, create them in Supabase or from the R&D/BOD User & Access screen; they are never exposed on the login page.

