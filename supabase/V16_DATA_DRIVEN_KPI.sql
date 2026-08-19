-- VMG Teacher 360 · V16 · Data-driven monthly KPI matrix
-- Run once after the existing V10–V15 upgrades.
-- Adds raw learner retention inputs, monthly issue snapshots, KPI band/data completeness,
-- and future-ready penalty fields. Penalty policy remains OFF by default.

alter table public.teacher_kpi_snapshots
  add column if not exists learner_start_count integer,
  add column if not exists learner_dropout_count integer not null default 0,
  add column if not exists incident_count integer not null default 0,
  add column if not exists pending_incident_count integer not null default 0,
  add column if not exists critical_incident_count integer not null default 0,
  add column if not exists data_completeness_pct numeric(5,2),
  add column if not exists kpi_band text,
  add column if not exists penalty_policy_active boolean not null default false,
  add column if not exists penalty_amount numeric(14,2) not null default 0,
  add column if not exists notes text;

-- Data integrity for newly recorded monthly retention data.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname='teacher_kpi_learner_counts_nonnegative'
  ) then
    alter table public.teacher_kpi_snapshots
      add constraint teacher_kpi_learner_counts_nonnegative
      check (
        (learner_start_count is null or learner_start_count >= 0)
        and learner_dropout_count >= 0
        and (learner_start_count is null or learner_dropout_count <= learner_start_count)
      ) not valid;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname='teacher_kpi_issue_counts_nonnegative'
  ) then
    alter table public.teacher_kpi_snapshots
      add constraint teacher_kpi_issue_counts_nonnegative
      check (incident_count >= 0 and pending_incident_count >= 0 and critical_incident_count >= 0) not valid;
  end if;
end $$;

create index if not exists teacher_kpi_period_idx
  on public.teacher_kpi_snapshots(period_start desc, teacher_id);

-- Centre / regional leaders are the operational owners of monthly learner-retention inputs.
-- RLS still limits them to teachers in their assigned scope.
drop policy if exists "kpi_insert" on public.teacher_kpi_snapshots;
create policy "kpi_insert" on public.teacher_kpi_snapshots
for insert to authenticated
with check (
  public.current_vmg_role() in ('cmo','centre_director','regional_director','ptns','rnd','bod')
  and public.can_view_teacher(teacher_id)
);

drop policy if exists "kpi_update" on public.teacher_kpi_snapshots;
create policy "kpi_update" on public.teacher_kpi_snapshots
for update to authenticated
using (
  public.current_vmg_role() in ('cmo','centre_director','regional_director','ptns','rnd','bod')
  and public.can_view_teacher(teacher_id)
)
with check (
  public.current_vmg_role() in ('cmo','centre_director','regional_director','ptns','rnd','bod')
  and public.can_view_teacher(teacher_id)
);

-- Explicitly keep all existing records in non-penalty mode.
update public.teacher_kpi_snapshots
set penalty_policy_active=false,
    penalty_amount=0
where penalty_policy_active is distinct from false
   or penalty_amount is distinct from 0;

notify pgrst, 'reload schema';
