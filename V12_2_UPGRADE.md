# V12.2 — Excel Import Reliability + Readability

No database migration is required.

## What this fixes

- Large Excel/CSV imports are split into small server requests so Vercel does not time out.
- The import UI no longer blindly calls `response.json()` on a 504/plain-text response.
- Progress is shown across batches.
- Row numbers in errors stay aligned with the original spreadsheet.
- Tiny import labels/helper text have been raised to a readable size.
- V12.1 observation timeline spacing remains included in `globals.css`.

## Deploy
Replace these three files in the existing repo:

- `src/app/api/admin/import/route.js`
- `src/components/HubClient.js`
- `src/app/globals.css`

Commit to `main`; let Vercel redeploy. No SQL is needed.
