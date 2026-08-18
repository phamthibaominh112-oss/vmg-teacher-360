# VMG Teacher 360 V10 · Performance Portfolio & Role Scope

## What changes
- Teacher Home becomes a personal performance portfolio dashboard.
- CMO / Centre Director Home becomes a centre teacher-performance dashboard.
- New `regional_director` role sees the assigned region and can compare centres in that region.
- Head Office roles (CSR, R&D, BOD, Academic Supervisor, PTNS) see the whole system with Region / Centre filters.
- Account creation is role-aware:
  - Teacher: Teacher code + professional level + centre (region derives from centre).
  - CMO / Centre Director: centre only (region derives automatically).
  - Regional Director: region only; no centre.
  - Head Office: no region and no centre.
- Adds `staff_code` and `job_title`.
- Bulk account import follows the same scope rules.

## Existing production upgrade
1. Supabase SQL Editor: run `supabase/V10_SCOPE_AND_ACCOUNTS.sql` once.
2. Upload the V10 patch files to the existing GitHub repo.
3. Let Vercel redeploy.
4. Create a test Regional Director account and verify regional-only visibility.
5. Verify CMO / Centre Director accounts have `home_centre_code` populated. V10 intentionally narrows them to their assigned centre.

No observation, KPI, incident, training or resource history is deleted.
