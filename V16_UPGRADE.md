# V16 · Data-driven Monthly Teacher KPI

This version replaces vague performance labels with a monthly, auditable KPI matrix.

## What changes

- Monthly KPI page is now visible to Teachers as well as relevant management roles.
- Teachers can see and export their own monthly KPI.
- Management can choose a month and export the whole in-scope KPI table to Excel.
- KPI export contains two sheets: Monthly KPI + Rubric.
- New raw learner-retention inputs:
  - learners at start of period
  - learner dropouts
  - HVR is calculated automatically: `(start - dropouts) / start * 100`
- Monthly issue counts are split into:
  - Director-approved issues
  - pending issues
  - critical approved issues
- Penalty fields exist for future policy readiness, but `penalty_policy_active=false` and `penalty_amount=0` by default.
- Approved issues do **not** deduct KPI in V16.
- KPI bands are explicit:
  - A = 90–100 · Strong
  - B = 80–89.9 · Meets standard
  - C = 70–79.9 · Needs improvement
  - D = below 70 · Action required
- Data Completeness shows how much of the weighted KPI has actual source data.
- Missing metrics are not silently treated as zero; available weights are re-normalised.
- Current operating weights remain:
  - Observation 50%
  - HVR 30%
  - Revenue contribution 20%
  These remain a draft operating model until formally approved by R&D/BOD.

## Observation rubric remains official VMG Performance Tracker logic

- >90 Excellent
- 81–90 Very good
- 70–80 Good
- 60–69 Satisfactory
- <60 Improvement / Training needed

## Who can record monthly raw KPI data

- CMO
- Centre Director
- Regional Director
- PTNS
- R&D
- BOD

Access remains restricted by the existing teacher-scope RLS rules.

## Deployment

1. Supabase → SQL Editor → run `supabase/V16_DATA_DRIVEN_KPI.sql` once.
2. Replace the V16 patch files in GitHub.
3. Let Vercel redeploy.
4. Test with one teacher for the current month:
   - enter learner base + dropouts
   - confirm HVR is calculated
   - confirm teacher can see the same KPI
   - export the monthly Excel file

Do not rerun `INSTALL_ALL.sql` on an existing database.
