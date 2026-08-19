# V16.1 · Teacher Evaluation Framework

No SQL migration is required.

## Added
A dedicated `Evaluation Framework / Khung đánh giá GV` section visible to teachers and relevant management roles.

The section explains:
- the monthly KPI matrix: metric, source, formula, weight, evidence and interpretation;
- KPI bands A/B/C/D;
- a professional competency matrix with observable behaviour at ratings 1–4;
- VMG Observation domain weights: Preparation 10%, Teaching Methodology & Skills 45%, Classroom Management 45%;
- learner retention / HVR data logic;
- approved/pending/critical issue transparency;
- issue-risk thresholds and current follow-up actions;
- explicit `PENALTY NOT ACTIVE` status;
- the monthly evidence → KPI → explanation → development cycle;
- exactly what information a teacher can see about their own evaluation.

## Excel export
Monthly KPI export now contains 4 sheets:
1. Monthly KPI
2. KPI Rubric
3. Competency Matrix
4. Issue Thresholds

## Deploy
Replace the patch files on GitHub and let Vercel redeploy.
No Supabase SQL is needed.
