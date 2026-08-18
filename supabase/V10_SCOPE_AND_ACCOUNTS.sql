-- VMG Teacher 360 V10 · role scope + account fields
-- Run once on an existing V9 database before deploying the V10 frontend.
-- This migration does not delete or rewrite teacher performance history.

alter type public.app_role add value if not exists 'regional_director';

alter table public.profiles add column if not exists staff_code text;
alter table public.profiles add column if not exists job_title text;
create unique index if not exists profiles_staff_code_unique
  on public.profiles(staff_code) where staff_code is not null;

-- Scope model
-- Teacher: self
-- CMO / Centre Director: assigned centre
-- Regional Director: assigned region
-- Head Office (CSR / R&D / BOD / Academic Supervisor / PTNS): whole system
create or replace function public.can_view_teacher(target uuid) returns boolean
language sql stable security definer set search_path=public
as $$
  select case
    when auth.uid() is null then false
    when auth.uid()=target then true
    when public.current_vmg_role()::text in ('csr','rnd','bod','academic_supervisor','ptns') then true
    when public.current_vmg_role()::text='regional_director' then exists(
      select 1 from public.profiles t
      where t.id=target and t.role='teacher' and t.region_no=public.current_vmg_region()
    )
    when public.current_vmg_role()::text in ('cmo','centre_director') then exists(
      select 1 from public.profiles t
      where t.id=target and t.role='teacher' and t.home_centre_code=public.current_vmg_centre()
    )
    else false
  end
$$;

-- Centre/region leadership should only write against teachers within their authorised scope.
drop policy if exists "support_read_scope" on public.support_requests;
create policy "support_read_scope" on public.support_requests for select to authenticated using (
  teacher_id=auth.uid()
  or public.current_vmg_role()::text in ('csr','rnd','bod','academic_supervisor','ptns')
  or (public.current_vmg_role()::text in ('cmo','centre_director','regional_director') and public.can_view_teacher(teacher_id))
);

drop policy if exists "support_update" on public.support_requests;
create policy "support_update" on public.support_requests for update to authenticated using (
  public.current_vmg_role()::text in ('csr','rnd','bod','academic_supervisor','ptns')
  or (public.current_vmg_role()::text in ('cmo','centre_director','regional_director') and public.can_view_teacher(teacher_id))
) with check (
  public.current_vmg_role()::text in ('csr','rnd','bod','academic_supervisor','ptns')
  or (public.current_vmg_role()::text in ('cmo','centre_director','regional_director') and public.can_view_teacher(teacher_id))
);

drop policy if exists "training_requests_insert" on public.training_requests;
create policy "training_requests_insert" on public.training_requests for insert to authenticated with check (
  public.current_vmg_role()::text in ('cmo','centre_director','regional_director','csr','academic_supervisor','rnd','bod')
  and public.can_view_teacher(teacher_id)
);

drop policy if exists "events_insert" on public.teacher_events;
create policy "events_insert" on public.teacher_events for insert to authenticated with check (
  public.current_vmg_role()::text in ('academic_supervisor','cmo','centre_director','regional_director','rnd','bod')
  and public.can_view_teacher(teacher_id)
);
drop policy if exists "events_update" on public.teacher_events;
create policy "events_update" on public.teacher_events for update to authenticated using (
  public.current_vmg_role()::text in ('academic_supervisor','cmo','centre_director','regional_director','rnd','bod')
  and public.can_view_teacher(teacher_id)
) with check (
  public.current_vmg_role()::text in ('academic_supervisor','cmo','centre_director','regional_director','rnd','bod')
  and public.can_view_teacher(teacher_id)
);

drop policy if exists "incidents_insert" on public.incidents;
create policy "incidents_insert" on public.incidents for insert to authenticated with check (
  public.current_vmg_role()::text in ('cmo','centre_director','regional_director','csr','rnd','bod')
  and public.can_view_teacher(teacher_id)
);
drop policy if exists "incidents_update" on public.incidents;
create policy "incidents_update" on public.incidents for update to authenticated using (
  public.current_vmg_role()::text in ('cmo','centre_director','regional_director','csr','rnd','bod')
  and public.can_view_teacher(teacher_id)
) with check (
  public.current_vmg_role()::text in ('cmo','centre_director','regional_director','csr','rnd','bod')
  and public.can_view_teacher(teacher_id)
);

drop policy if exists "touchpoints_insert" on public.teacher_touchpoints;
create policy "touchpoints_insert" on public.teacher_touchpoints for insert to authenticated with check (
  public.current_vmg_role()::text in ('academic_supervisor','cmo','centre_director','regional_director','rnd','bod')
  and public.can_view_teacher(teacher_id)
);
drop policy if exists "touchpoints_update" on public.teacher_touchpoints;
create policy "touchpoints_update" on public.teacher_touchpoints for update to authenticated using (
  public.current_vmg_role()::text in ('academic_supervisor','cmo','centre_director','regional_director','rnd','bod')
  and public.can_view_teacher(teacher_id)
) with check (
  public.current_vmg_role()::text in ('academic_supervisor','cmo','centre_director','regional_director','rnd','bod')
  and public.can_view_teacher(teacher_id)
);

drop policy if exists "registrations_read" on public.training_registrations;
create policy "registrations_read" on public.training_registrations for select to authenticated using (
  user_id=auth.uid()
  or public.current_vmg_role()::text in ('academic_supervisor','rnd','bod','csr','cmo','centre_director','regional_director','ptns')
);

comment on column public.profiles.staff_code is 'Internal employee/staff code. Separate from teacher_code.';
comment on column public.profiles.job_title is 'Human-readable job title shown in account and access management.';
