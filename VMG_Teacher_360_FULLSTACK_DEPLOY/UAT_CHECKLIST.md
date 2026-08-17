# VMG Teacher 360 — Production UAT checklist

## Authentication
- [ ] Login page contains no demo credentials or role cards.
- [ ] Password reset returns to the deployed domain.
- [ ] Disabled users cannot continue to operational pages.

## Teacher experience
- [ ] My Hub is English-first and the EN/VI switch works.
- [ ] Montserrat is used across UI controls and content.
- [ ] My Portfolio shows capability matrix, evidence confidence, strengths, growth priorities, programme-fit signal and upgrade readiness.
- [ ] Growth Matrix calculates from saved criterion-level observation records.
- [ ] Observation & Feedback shows own records only.
- [ ] Training & Calendar shows relevant training/events and booking works.
- [ ] Resource Center shows 109 linked source resources and original hyperlinks open correctly.
- [ ] My Documents shows own document readiness only.
- [ ] Support & Feedback creates a routed request.

## Management permissions
- [ ] Region 1 CMO cannot see Region 2/3 teachers.
- [ ] Same-region borrowing/cross-centre teacher view works.
- [ ] Centre Director can approve teacher cases.
- [ ] AS can create observations, training and teacher touchpoints.
- [ ] PTNS can update teacher HR records and bulletin.
- [ ] R&D/BOD can manage full scope and user accounts.
- [ ] Only R&D/BOD can delete governed records.

## Workflow automation
- [ ] Approved incident creates notifications for R&D/BOD/PTNS/CSR + teacher.
- [ ] New training creates stakeholder/target-teacher notifications.
- [ ] T−24h reminders are generated only once per event/person.
- [ ] Touchpoint deficit reminder reflects the 2-touch/week rule.
- [ ] Promised document dates trigger reminders.

## Files and security
- [ ] Teacher cannot open another teacher's HR document path.
- [ ] Teacher cannot open another teacher's evidence path.
- [ ] Service-role key is not visible in browser source/network payloads.
- [ ] RLS policies are enabled on every governed table.
- [ ] Supabase Security Advisor is reviewed before go-live.
