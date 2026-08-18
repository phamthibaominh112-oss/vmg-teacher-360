# VMG Teacher 360 · V6 Academic Fresh

## What changed

- Academic, teacher-inspiring visual language across the workspace.
- Global VMG academic footer with 23 years, Cambridge English, IELTS and Teacher Growth proof points.
- Visual Academic Resource Library with programme studio cards for E-Genius, IELTS and Teacher Toolkit.
- Staff Bulletin redesigned as a lively but corporate teacher-room board.
- Cleaner EN/VI static interface copy and simpler menu labels.
- No backend-provider / database wording is exposed in the teacher UI.
- Account form includes a one-click temporary password generator.
- Account + bulk-import API now supports `SUPABASE_SECRET_KEY` (recommended) with legacy `SUPABASE_SERVICE_ROLE_KEY` fallback and clearer configuration errors.

## Fix for “Invalid API key” when creating an account

The normal app login can work while account creation fails because account provisioning uses a separate server-only admin key.

In Vercel → `vmg-teacher-360` → Settings → Environment Variables:

1. Keep `NEXT_PUBLIC_SUPABASE_URL` pointed to the current project.
2. Add `SUPABASE_SECRET_KEY` and set it to a fresh secret/admin key copied from the SAME current Supabase project.
3. You may remove the old `SUPABASE_SERVICE_ROLE_KEY`, or keep it blank. V6 still supports it as a legacy fallback.
4. Apply the secret to Production (and Preview if you use preview deployments).
5. Redeploy Production after saving the environment variable.

Never expose the secret key in browser code or chat.

## Deployment

Replace the patch files in the existing GitHub repository and commit to `main`. Vercel will redeploy automatically. No database migration is required for V6.
