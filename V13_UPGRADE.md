# VMG Teacher 360 · V13 Account Repair + Teacher Handbook

## What this fixes

### 1. Excel import display-name repair
Earlier timed-out imports could create an Auth user first. The `on_auth_user_created` trigger then temporarily used the email prefix as `full_name` before the import request reached the profile update. That is why names such as `t220003` could appear even though the spreadsheet contains the correct teacher name.

V13 fixes both sides:
- new Auth accounts are created with `user_metadata.full_name` immediately;
- existing Auth accounts are re-synchronised with `full_name` + role metadata whenever the Accounts Excel import runs;
- `profiles.full_name` is still updated from the spreadsheet as the system-of-record display name.

### Repair existing incorrect names
After deploying V13, import the same Accounts Excel file again. Existing users are matched by email, so passwords are not reset; their profile names and access metadata are repaired.

## 2. Edit / remove access for R&D and BOD
Accounts & Access now has an Action column.

**Edit** can change:
- full name
- email
- password (optional)
- role
- staff code / teacher code
- job title
- professional level
- centre / region according to the role rules
- interface language
- active / inactive status

**Remove** intentionally archives access instead of erasing professional history:
- sign-in is banned at Supabase Auth;
- profile becomes inactive;
- observation, case, training, KPI and audit history are retained.

An inactive account can be restored through Edit → Active.

Only R&D and BOD have this account-administration endpoint.

## 3. Teacher Standards & Handbook
Teacher navigation now contains `Teacher Standards & Handbook / Quy định & Nội quy GV`.

It covers:
- punctuality & readiness
- teaching quality
- classroom management & learner care
- schedule & professional communication
- document / evidence responsibilities
- observation, coaching and professional development
- a transparent four-step explanation of how teacher cases are handled

A quick link is also shown on the teacher dashboard so the standards are visible before an issue occurs.

## Deployment
No database migration is required.

Replace these files from the patch:
- `src/app/api/admin/import/route.js`
- `src/app/api/admin/users/route.js`
- `src/app/hub/page.js`
- `src/components/HubClient.js`
- `src/lib/i18n.js`
- `src/app/globals.css`

Then commit to `main` and let Vercel redeploy.

## After deployment
1. Re-import the same teacher Accounts Excel file once to repair old display names.
2. Open Accounts & Access and verify `t220003`, `t220031`, etc. now show their spreadsheet `full_name` values.
3. Test Edit on one test account.
4. Test Remove on a disposable/test account, then Edit → Active to confirm reactivation.
5. Sign in as a Teacher and confirm `Quy định & Nội quy GV` appears in navigation and on Home.
