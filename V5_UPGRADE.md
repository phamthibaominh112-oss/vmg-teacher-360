# VMG Teacher 360 · V5 Fresh Workday Upgrade

This is a frontend + import upgrade for the existing VMG Teacher 360 production project.

## What changed

- Brighter, friendlier teacher-first visual system: white sidebar, softer VMG rose/gold accents, cleaner cards, forms and modal layouts.
- Clearer grouped navigation for teachers and management roles.
- Consistent EN / VI interface labels, date wording, status labels, role names, observation rubric labels and dynamic system values.
- Removed visible backend/vendor wording from the product UI.
- Account onboarding now offers two clear paths: create one account or bulk import a whole list.
- Bulk CSV / Excel import for:
  1. Accounts
  2. Historical observation records
  3. Training calendar
  4. Internal announcements
- Downloadable CSV and Excel templates inside the Import page.
- Historical observation import accepts either final_score or the full rating_1 ... rating_15 rubric. Final-score-only records still contribute as low-confidence baseline evidence in growth views.
- Duplicate protection: exact duplicate observations, trainings and announcements are skipped on repeat imports.
- Existing accounts are matched by email and updated instead of recreated.

## No new database migration required

This V5 package uses the existing tables already deployed by INSTALL_ALL.sql and the post-migration patch. Do not rerun the database migration just for this UI upgrade.

## Files to replace in the existing GitHub repository

Replace / add these paths on the `main` branch:

- `package.json`
- `src/app/globals.css`
- `src/app/login/page.js`
- `src/app/hub/page.js`
- `src/components/HubClient.js`
- `src/lib/i18n.js`
- `src/lib/config.js`
- `src/app/api/admin/import/route.js` (new)

After the commit, Vercel should automatically build a new production deployment from GitHub.

## Important

The new Excel import feature adds the `xlsx` dependency in `package.json`. Do not remove that dependency.

Existing Vercel environment variables remain unchanged.
