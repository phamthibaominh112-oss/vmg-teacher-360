# V14 · Bulk Account Admin

No SQL migration is required.

## Added
- Multi-select checkboxes on `Accounts & Access`.
- `Select all teachers`.
- `Clear selection`.
- `Remove selected (N)`.
- Bulk removal is restricted to R&D/BOD by the existing server permission gate.
- Bulk removal is restricted to active `teacher` accounts.
- The current administrator cannot remove their own account.
- Large selections are automatically sent in batches of 20 from the browser.
- The API processes Auth updates in bounded concurrent groups.
- Removal archives sign-in access rather than deleting historical observations, incidents, KPI, training, documents or audit history.

## Deploy
Replace the files in this patch on GitHub and let Vercel redeploy. No Supabase SQL is needed.
