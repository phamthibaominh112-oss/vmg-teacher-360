-- VMG Teacher 360 · Supabase schema
-- Run once in Supabase SQL Editor on a new project.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('teacher','cmo','centre_director','csr','rnd','bod','academic_supervisor','ptns');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_severity as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

create table if not exists public.centres (
  code text primary key,
  name text,
  region_no smallint not null check (region_no between 1 and 3),
  is_active boolean not null default true
);
insert into public.centres(code,name,region_no) values
('PVT','PVT',1),('VTS','VTS',1),('NKN','NKN',1),('TBM','TBM',1),
('LDN','LDN',2),('HVG','HVG',2),('TPU','TPU',2),('NTI','NTI',2),('PTA','PTA',2),
('BPC','BPC',3)
on conflict(code) do update set region_no=excluded.region_no;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null,
  role public.app_role not null default 'teacher',
  teacher_code text unique,
  home_centre_code text references public.centres(code),
  region_no smallint check (region_no between 1 and 3),
  professional_level text,
  phone text,
  employment_status text default 'active',
  development_focus text,
  language_preference text not null default 'en' check (language_preference in ('en','vi')),
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_region_idx on public.profiles(region_no,home_centre_code);

create or replace function public.current_vmg_role() returns public.app_role
language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;

create or replace function public.current_vmg_region() returns smallint
language sql stable security definer set search_path=public
as $$ select region_no from public.profiles where id=auth.uid() $$;

create or replace function public.current_vmg_centre() returns text
language sql stable security definer set search_path=public
as $$ select home_centre_code from public.profiles where id=auth.uid() $$;

create or replace function public.can_view_teacher(target uuid) returns boolean
language sql stable security definer set search_path=public
as $$
  select case
    when auth.uid() is null then false
    when auth.uid()=target then true
    when public.current_vmg_role() in ('csr','rnd','bod','academic_supervisor','ptns') then true
    when public.current_vmg_role() in ('cmo','centre_director') then exists(
      select 1 from public.profiles t where t.id=target and t.role='teacher' and t.region_no=public.current_vmg_region()
    )
    else false
  end
$$;

create or replace function public.is_delete_admin() returns boolean
language sql stable security definer set search_path=public
as $$ select public.current_vmg_role() in ('rnd','bod') $$;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_vi text,
  body_en text not null,
  body_vi text,
  audience text not null default 'All teachers',
  target_region_no smallint,
  target_centre_code text,
  author_id uuid references public.profiles(id),
  author_name text,
  published_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);


create table if not exists public.academic_resources (
  id bigint generated always as identity primary key,
  programme text not null,
  stage text,
  cefr text,
  audience text,
  name text not null,
  category text not null,
  workflow text not null check (workflow in ('Prepare','Teach','Assess')),
  priority text,
  notes text,
  url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(programme,name,url)
);
create index if not exists academic_resources_programme_idx on public.academic_resources(programme,category,workflow);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id),
  category text not null,
  subject text not null,
  details text not null,
  routed_to text,
  owner_id uuid references public.profiles(id),
  status text not null default 'open' check (status in ('open','in_progress','waiting_teacher','closed')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists support_requests_teacher_idx on public.support_requests(teacher_id,created_at desc);
create index if not exists support_requests_status_idx on public.support_requests(status,category);

create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  training_type text not null,
  reason text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  audience_label text,
  target_region_no smallint,
  target_centre_code text,
  slides_path text,
  recap_text text,
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists trainings_starts_idx on public.trainings(starts_at);

create table if not exists public.training_registrations (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'booked',
  booked_at timestamptz not null default now(),
  attended_at timestamptz,
  unique(training_id,user_id)
);

create table if not exists public.training_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  category text not null,
  reason text not null,
  priority text not null default 'normal',
  requested_by uuid references public.profiles(id),
  requested_by_name text,
  status text not null default 'submitted',
  rnd_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  event_type text not null check (event_type in ('Catch-up','Retraining','Teacher Meeting','Performance Meeting','Other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  booked_by uuid references public.profiles(id),
  booked_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists teacher_events_starts_idx on public.teacher_events(starts_at);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  observer_id uuid references public.profiles(id),
  observer_name text,
  observed_at timestamptz not null,
  observation_type text not null check (observation_type in ('Full Observation','Re-observation','Pop-up Check')),
  purpose text,
  class_name text,
  textbook text,
  teaching_assistant text,
  criteria_scores jsonb not null default '[]'::jsonb,
  final_score numeric(5,2),
  strengths text,
  improvement_areas text,
  teacher_reflection text,
  smart_action text,
  verify_by date,
  status text not null default 'draft',
  teacher_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists observations_teacher_date_idx on public.observations(teacher_id,observed_at desc);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  case_code text unique,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  centre_code text,
  region_no smallint,
  category text not null,
  severity public.case_severity not null default 'medium',
  title text not null,
  details text not null,
  evidence_paths text[] not null default '{}',
  logged_by uuid references public.profiles(id),
  logged_by_name text,
  action_owner text,
  due_date date,
  status text not null default 'pending_director_approval',
  director_approved_at timestamptz,
  director_approved_by uuid references public.profiles(id),
  teacher_delivery_due_at timestamptz,
  teacher_notified_at timestamptz,
  closure_evidence text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists incidents_teacher_date_idx on public.incidents(teacher_id,created_at desc);
create index if not exists incidents_status_idx on public.incidents(status,severity);

create table if not exists public.teacher_touchpoints (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  touch_date date not null default current_date,
  touch_type text not null,
  owner_id uuid references public.profiles(id),
  owner_name text,
  notes text,
  evidence_path text,
  created_at timestamptz not null default now()
);
create index if not exists touchpoints_teacher_date_idx on public.teacher_touchpoints(teacher_id,touch_date desc);

create table if not exists public.teacher_documents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique references public.profiles(id) on delete cascade,
  degree_status text not null default 'Missing',
  tesol_status text not null default 'Missing',
  english_status text not null default 'Missing',
  native_proof_status text not null default 'N/A',
  promised_submission_date date,
  completion_pct numeric(5,2) not null default 0 check (completion_pct between 0 and 100),
  document_paths text[] not null default '{}',
  notes text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  observation_score numeric(5,2),
  hvr_pct numeric(5,2),
  revenue_contribution numeric(14,2),
  composite_score numeric(5,2),
  weight_observation numeric(5,2) default 50,
  weight_hvr numeric(5,2) default 30,
  weight_revenue numeric(5,2) default 20,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(teacher_id,period_start,period_end)
);

create table if not exists public.upgrade_recommendations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  current_level text,
  proposed_level text not null,
  rationale text not null,
  evidence_summary text not null,
  proposed_by uuid references public.profiles(id),
  proposed_by_name text,
  status text not null default 'pending_rnd_approval',
  reviewed_by uuid references public.profiles(id),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind text,
  link_target text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);

create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  user_id uuid references public.profiles(id) on delete cascade,
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  entity_table text not null,
  entity_id uuid,
  action text not null,
  snapshot jsonb,
  created_at timestamptz not null default now()
);

-- Automatically create a minimal profile when users are created in Supabase Auth.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,email,full_name,role,language_preference)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,'VMG User'),'@',1)),
    coalesce((new.raw_app_meta_data->>'vmg_role')::public.app_role,'teacher'),
    coalesce(new.raw_user_meta_data->>'language_preference','en')
  ) on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

do $$ begin
  if not exists(select 1 from pg_trigger where tgname='profiles_updated_at') then create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.touch_updated_at(); end if;
  if not exists(select 1 from pg_trigger where tgname='observations_updated_at') then create trigger observations_updated_at before update on public.observations for each row execute procedure public.touch_updated_at(); end if;
  if not exists(select 1 from pg_trigger where tgname='incidents_updated_at') then create trigger incidents_updated_at before update on public.incidents for each row execute procedure public.touch_updated_at(); end if;
  if not exists(select 1 from pg_trigger where tgname='training_requests_updated_at') then create trigger training_requests_updated_at before update on public.training_requests for each row execute procedure public.touch_updated_at(); end if;
  if not exists(select 1 from pg_trigger where tgname='academic_resources_updated_at') then create trigger academic_resources_updated_at before update on public.academic_resources for each row execute procedure public.touch_updated_at(); end if;
  if not exists(select 1 from pg_trigger where tgname='support_requests_updated_at') then create trigger support_requests_updated_at before update on public.support_requests for each row execute procedure public.touch_updated_at(); end if;
end $$;


create or replace function public.enforce_profile_governance() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if old.role is distinct from new.role and public.current_vmg_role() not in ('rnd','bod') then
    raise exception 'Only R&D/BOD may change a user role';
  end if;
  if old.professional_level is distinct from new.professional_level and public.current_vmg_role() not in ('rnd','bod') then
    raise exception 'Professional level changes require R&D/BOD approval';
  end if;
  return new;
end $$;
drop trigger if exists profile_governance on public.profiles;
create trigger profile_governance before update on public.profiles for each row execute procedure public.enforce_profile_governance();

create or replace function public.enforce_incident_approval_authority() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if old.director_approved_at is null and new.director_approved_at is not null
     and public.current_vmg_role() not in ('centre_director','rnd','bod') then
    raise exception 'Centre Director/R&D/BOD approval required';
  end if;
  return new;
end $$;
drop trigger if exists incident_approval_authority on public.incidents;
create trigger incident_approval_authority before update on public.incidents for each row execute procedure public.enforce_incident_approval_authority();

create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.audit_events(actor_id,entity_table,entity_id,action,snapshot)
  values(auth.uid(),tg_table_name,coalesce(new.id,old.id),tg_op,case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new,old);
end $$;

do $$ declare tbl text; begin
  foreach tbl in array array['incidents','observations','teacher_documents','upgrade_recommendations','support_requests','trainings','teacher_events'] loop
    execute format('drop trigger if exists audit_%I on public.%I',tbl,tbl);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute procedure public.audit_row_change()',tbl,tbl);
  end loop;
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.academic_resources enable row level security;
alter table public.support_requests enable row level security;
alter table public.trainings enable row level security;
alter table public.training_registrations enable row level security;
alter table public.training_requests enable row level security;
alter table public.teacher_events enable row level security;
alter table public.observations enable row level security;
alter table public.incidents enable row level security;
alter table public.teacher_touchpoints enable row level security;
alter table public.teacher_documents enable row level security;
alter table public.teacher_kpi_snapshots enable row level security;
alter table public.upgrade_recommendations enable row level security;
alter table public.notifications enable row level security;
alter table public.reminder_log enable row level security;
alter table public.audit_events enable row level security;

-- Profiles
create policy "profiles_select_scope" on public.profiles for select to authenticated using (
  id=auth.uid() or (role='teacher' and public.can_view_teacher(id)) or public.current_vmg_role() in ('rnd','bod','ptns')
);
create policy "profiles_update_governed" on public.profiles for update to authenticated using (public.current_vmg_role() in ('rnd','bod','ptns')) with check (public.current_vmg_role() in ('rnd','bod','ptns'));
create policy "profiles_delete_admin" on public.profiles for delete to authenticated using (public.is_delete_admin());

-- Announcements
create policy "announcements_read" on public.announcements for select to authenticated using (
  is_active=true and (
    public.current_vmg_role()<>'teacher'
    or ((target_region_no is null or target_region_no=public.current_vmg_region())
        and (target_centre_code is null or target_centre_code=public.current_vmg_centre()))
  )
);
create policy "announcements_write" on public.announcements for insert to authenticated with check (public.current_vmg_role() in ('ptns','rnd','bod'));
create policy "announcements_update" on public.announcements for update to authenticated using (public.current_vmg_role() in ('ptns','rnd','bod')) with check (public.current_vmg_role() in ('ptns','rnd','bod'));
create policy "announcements_delete" on public.announcements for delete to authenticated using (public.is_delete_admin());


-- Academic resource catalogue
create policy "resources_read" on public.academic_resources for select to authenticated using (is_active=true);
create policy "resources_insert" on public.academic_resources for insert to authenticated with check (public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "resources_update" on public.academic_resources for update to authenticated using (public.current_vmg_role() in ('academic_supervisor','rnd','bod')) with check (public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "resources_delete" on public.academic_resources for delete to authenticated using (public.is_delete_admin());

-- Teacher support requests
create policy "support_read_scope" on public.support_requests for select to authenticated using (
  teacher_id=auth.uid()
  or public.current_vmg_role() in ('csr','rnd','bod','academic_supervisor','ptns')
  or (public.current_vmg_role() in ('cmo','centre_director') and public.can_view_teacher(teacher_id))
);
create policy "support_insert" on public.support_requests for insert to authenticated with check (
  created_by=auth.uid() and (teacher_id=auth.uid() or public.current_vmg_role()<>'teacher')
);
create policy "support_update" on public.support_requests for update to authenticated using (
  public.current_vmg_role() in ('csr','rnd','bod','academic_supervisor','ptns')
  or (public.current_vmg_role() in ('cmo','centre_director') and public.can_view_teacher(teacher_id))
) with check (
  public.current_vmg_role() in ('csr','rnd','bod','academic_supervisor','ptns')
  or (public.current_vmg_role() in ('cmo','centre_director') and public.can_view_teacher(teacher_id))
);
create policy "support_delete" on public.support_requests for delete to authenticated using (public.is_delete_admin());

-- Training
create policy "trainings_read" on public.trainings for select to authenticated using (
  public.current_vmg_role()<>'teacher'
  or ((target_region_no is null or target_region_no=public.current_vmg_region())
      and (target_centre_code is null or target_centre_code=public.current_vmg_centre()))
);
create policy "trainings_insert" on public.trainings for insert to authenticated with check (public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "trainings_update" on public.trainings for update to authenticated using (public.current_vmg_role() in ('academic_supervisor','rnd','bod')) with check (public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "trainings_delete" on public.trainings for delete to authenticated using (public.is_delete_admin());

create policy "registrations_read" on public.training_registrations for select to authenticated using (user_id=auth.uid() or public.current_vmg_role() in ('academic_supervisor','rnd','bod','csr','cmo','centre_director','ptns'));
create policy "registrations_insert_self" on public.training_registrations for insert to authenticated with check (user_id=auth.uid());
create policy "registrations_update_self" on public.training_registrations for update to authenticated using (user_id=auth.uid() or public.current_vmg_role() in ('academic_supervisor','rnd','bod')) with check (user_id=auth.uid() or public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "registrations_delete_admin" on public.training_registrations for delete to authenticated using (public.is_delete_admin());

create policy "training_requests_read" on public.training_requests for select to authenticated using (public.can_view_teacher(teacher_id) and public.current_vmg_role()<>'teacher');
create policy "training_requests_insert" on public.training_requests for insert to authenticated with check (public.current_vmg_role() in ('cmo','centre_director','csr','academic_supervisor','rnd','bod'));
create policy "training_requests_update" on public.training_requests for update to authenticated using (public.current_vmg_role() in ('academic_supervisor','rnd','bod')) with check (public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "training_requests_delete" on public.training_requests for delete to authenticated using (public.is_delete_admin());

-- Teacher events
create policy "events_read" on public.teacher_events for select to authenticated using (teacher_id=auth.uid() or public.can_view_teacher(teacher_id));
create policy "events_insert" on public.teacher_events for insert to authenticated with check (public.current_vmg_role() in ('academic_supervisor','cmo','centre_director','rnd','bod'));
create policy "events_update" on public.teacher_events for update to authenticated using (public.current_vmg_role() in ('academic_supervisor','cmo','centre_director','rnd','bod')) with check (public.current_vmg_role() in ('academic_supervisor','cmo','centre_director','rnd','bod'));
create policy "events_delete" on public.teacher_events for delete to authenticated using (public.is_delete_admin());

-- Observations
create policy "observations_read" on public.observations for select to authenticated using (public.can_view_teacher(teacher_id));
create policy "observations_insert" on public.observations for insert to authenticated with check (public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "observations_update" on public.observations for update to authenticated using (public.current_vmg_role() in ('academic_supervisor','rnd','bod')) with check (public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "observations_delete" on public.observations for delete to authenticated using (public.is_delete_admin());

-- Incidents
create policy "incidents_read" on public.incidents for select to authenticated using (
  (teacher_id=auth.uid() and director_approved_at is not null)
  or (public.current_vmg_role()<>'teacher' and public.can_view_teacher(teacher_id))
);
create policy "incidents_insert" on public.incidents for insert to authenticated with check (public.current_vmg_role() in ('cmo','centre_director','csr','rnd','bod'));
create policy "incidents_update" on public.incidents for update to authenticated using (public.current_vmg_role() in ('cmo','centre_director','csr','rnd','bod') and public.can_view_teacher(teacher_id)) with check (public.current_vmg_role() in ('cmo','centre_director','csr','rnd','bod') and public.can_view_teacher(teacher_id));
create policy "incidents_delete" on public.incidents for delete to authenticated using (public.is_delete_admin());

-- Touchpoints
create policy "touchpoints_read" on public.teacher_touchpoints for select to authenticated using (public.can_view_teacher(teacher_id));
create policy "touchpoints_insert" on public.teacher_touchpoints for insert to authenticated with check (public.current_vmg_role() in ('academic_supervisor','cmo','centre_director','rnd','bod'));
create policy "touchpoints_update" on public.teacher_touchpoints for update to authenticated using (public.current_vmg_role() in ('academic_supervisor','cmo','centre_director','rnd','bod')) with check (public.current_vmg_role() in ('academic_supervisor','cmo','centre_director','rnd','bod'));
create policy "touchpoints_delete" on public.teacher_touchpoints for delete to authenticated using (public.is_delete_admin());

-- HR documents
create policy "documents_read" on public.teacher_documents for select to authenticated using (public.can_view_teacher(teacher_id));
create policy "documents_insert" on public.teacher_documents for insert to authenticated with check (public.current_vmg_role() in ('ptns','rnd','bod'));
create policy "documents_update" on public.teacher_documents for update to authenticated using (public.current_vmg_role() in ('ptns','rnd','bod')) with check (public.current_vmg_role() in ('ptns','rnd','bod'));
create policy "documents_delete" on public.teacher_documents for delete to authenticated using (public.is_delete_admin());

-- KPI
create policy "kpi_read" on public.teacher_kpi_snapshots for select to authenticated using (public.can_view_teacher(teacher_id));
create policy "kpi_insert" on public.teacher_kpi_snapshots for insert to authenticated with check (public.current_vmg_role() in ('ptns','rnd','bod'));
create policy "kpi_update" on public.teacher_kpi_snapshots for update to authenticated using (public.current_vmg_role() in ('ptns','rnd','bod')) with check (public.current_vmg_role() in ('ptns','rnd','bod'));
create policy "kpi_delete" on public.teacher_kpi_snapshots for delete to authenticated using (public.is_delete_admin());

-- Upgrade pipeline
create policy "upgrades_read" on public.upgrade_recommendations for select to authenticated using (public.can_view_teacher(teacher_id));
create policy "upgrades_insert" on public.upgrade_recommendations for insert to authenticated with check (public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "upgrades_update" on public.upgrade_recommendations for update to authenticated using (public.current_vmg_role() in ('rnd','bod')) with check (public.current_vmg_role() in ('rnd','bod'));
create policy "upgrades_delete" on public.upgrade_recommendations for delete to authenticated using (public.is_delete_admin());

-- Notifications / reminders / audits
create policy "notifications_read_own" on public.notifications for select to authenticated using (user_id=auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "reminder_log_admin_read" on public.reminder_log for select to authenticated using (public.current_vmg_role() in ('rnd','bod'));
create policy "audit_read" on public.audit_events for select to authenticated using (public.current_vmg_role() in ('rnd','bod','ptns'));

-- Storage buckets. Private by default; access is controlled below.
insert into storage.buckets(id,name,public) values
('teacher-evidence','teacher-evidence',false),
('teacher-documents','teacher-documents',false),
('training-materials','training-materials',false)
on conflict(id) do nothing;

create policy "evidence_read_authenticated" on storage.objects for select to authenticated using (
  bucket_id='teacher-evidence'
  and array_length(storage.foldername(name),1)>=1
  and public.can_view_teacher(((storage.foldername(name))[1])::uuid)
);
create policy "evidence_upload_case_roles" on storage.objects for insert to authenticated with check (bucket_id='teacher-evidence' and public.current_vmg_role() in ('cmo','centre_director','csr','academic_supervisor','rnd','bod'));
create policy "evidence_delete_admin" on storage.objects for delete to authenticated using (bucket_id='teacher-evidence' and public.is_delete_admin());

create policy "documents_read_authenticated" on storage.objects for select to authenticated using (
  bucket_id='teacher-documents'
  and array_length(storage.foldername(name),1)>=1
  and public.can_view_teacher(((storage.foldername(name))[1])::uuid)
);
create policy "documents_upload_hr" on storage.objects for insert to authenticated with check (bucket_id='teacher-documents' and public.current_vmg_role() in ('ptns','rnd','bod'));
create policy "documents_storage_delete_admin" on storage.objects for delete to authenticated using (bucket_id='teacher-documents' and public.is_delete_admin());

create policy "training_materials_read" on storage.objects for select to authenticated using (bucket_id='training-materials');
create policy "training_materials_upload" on storage.objects for insert to authenticated with check (bucket_id='training-materials' and public.current_vmg_role() in ('academic_supervisor','rnd','bod'));
create policy "training_materials_delete" on storage.objects for delete to authenticated using (bucket_id='training-materials' and public.is_delete_admin());

-- Helpful grants for the Data API.
grant usage on schema public to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;

-- Workflow notifications (security-definer triggers)
create or replace function public.notify_training_created() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.notifications(user_id,title,body,kind,link_target)
  select p.id,'New training scheduled',new.title || ' · ' || to_char(new.starts_at at time zone 'Asia/Ho_Chi_Minh','DD Mon YYYY HH24:MI'),'training_scheduled','training'
  from public.profiles p
  where p.is_active=true
    and p.role in ('teacher','rnd','bod','cmo','centre_director','csr')
    and (
      (p.role in ('rnd','bod','csr'))
      or (p.role in ('cmo','centre_director') and (new.target_region_no is null or p.region_no=new.target_region_no))
      or (p.role='teacher'
          and (new.target_region_no is null or p.region_no=new.target_region_no)
          and (new.target_centre_code is null or p.home_centre_code=new.target_centre_code))
    );
  return new;
end $$;
drop trigger if exists training_created_notifications on public.trainings;
create trigger training_created_notifications after insert on public.trainings for each row execute procedure public.notify_training_created();

create or replace function public.notify_training_booking() returns trigger
language plpgsql security definer set search_path=public
as $$
declare training_title text; training_time timestamptz;
begin
  select title,starts_at into training_title,training_time from public.trainings where id=new.training_id;
  insert into public.notifications(user_id,title,body,kind,link_target)
  values(new.user_id,'Training booking confirmed',coalesce(training_title,'Training') || ' · ' || to_char(training_time at time zone 'Asia/Ho_Chi_Minh','DD Mon YYYY HH24:MI'),'training_booking','training');
  return new;
end $$;
drop trigger if exists training_booking_notification on public.training_registrations;
create trigger training_booking_notification after insert on public.training_registrations for each row execute procedure public.notify_training_booking();

create or replace function public.notify_teacher_event() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if new.teacher_id is not null then
    insert into public.notifications(user_id,title,body,kind,link_target)
    values(new.teacher_id,'New teacher event booked',new.title || ' · ' || to_char(new.starts_at at time zone 'Asia/Ho_Chi_Minh','DD Mon YYYY HH24:MI'),'teacher_event','calendar');
  end if;
  return new;
end $$;
drop trigger if exists teacher_event_notification on public.teacher_events;
create trigger teacher_event_notification after insert on public.teacher_events for each row execute procedure public.notify_teacher_event();

create or replace function public.notify_incident_approval() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if old.director_approved_at is null and new.director_approved_at is not null then
    insert into public.notifications(user_id,title,body,kind,link_target)
    select p.id,'Teacher case approved',coalesce(new.case_code,new.id::text) || ' · ' || new.title,'incident_approved','incidents'
    from public.profiles p
    where p.is_active=true and p.role in ('rnd','bod','ptns','csr');

    insert into public.notifications(user_id,title,body,kind,link_target)
    values(new.teacher_id,'Approved teacher record',new.title || '. Please review the approved record and any follow-up action.','teacher_case','incidents');
  end if;
  return new;
end $$;
drop trigger if exists incident_approval_notifications on public.incidents;
create trigger incident_approval_notifications after update on public.incidents for each row execute procedure public.notify_incident_approval();


create or replace function public.notify_support_request() returns trigger
language plpgsql security definer set search_path=public
as $$
declare teacher_region smallint;
begin
  select region_no into teacher_region from public.profiles where id=new.teacher_id;

  insert into public.notifications(user_id,title,body,kind,link_target)
  select p.id,
         'Teacher support request',
         new.category || ' · ' || new.subject,
         'support_request',
         'support'
  from public.profiles p
  where p.is_active=true and (
    (new.routed_to ilike '%PTNS%' and p.role in ('ptns','rnd','bod'))
    or (new.routed_to ilike '%CSR%' and p.role in ('csr','rnd','bod'))
    or (new.routed_to ilike '%CMO%' and p.role in ('cmo','centre_director','rnd','bod') and (p.role in ('rnd','bod') or p.region_no=teacher_region))
    or (new.routed_to ilike '%Academic%' and p.role in ('academic_supervisor','rnd','bod'))
    or (new.routed_to='R&D' and p.role in ('rnd','bod'))
  );
  return new;
end $$;
drop trigger if exists support_request_notification on public.support_requests;
create trigger support_request_notification after insert on public.support_requests for each row execute procedure public.notify_support_request();

create or replace function public.notify_support_update() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if old.status is distinct from new.status or old.resolution is distinct from new.resolution then
    insert into public.notifications(user_id,title,body,kind,link_target)
    values(new.teacher_id,'Support request updated',new.subject || ' · Status: ' || new.status,'support_update','support');
  end if;
  return new;
end $$;
drop trigger if exists support_update_notification on public.support_requests;
create trigger support_update_notification after update on public.support_requests for each row execute procedure public.notify_support_update();

create or replace function public.notify_upgrade_proposal() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.notifications(user_id,title,body,kind,link_target)
  select p.id,'Teacher upgrade proposal',coalesce(new.proposed_by_name,'Academic team') || ' proposed ' || new.proposed_level || '. Rationale: ' || left(new.rationale,180),'upgrade_proposal','upgrades'
  from public.profiles p where p.is_active=true and p.role in ('rnd','bod');
  return new;
end $$;
drop trigger if exists upgrade_proposal_notification on public.upgrade_recommendations;
create trigger upgrade_proposal_notification after insert on public.upgrade_recommendations for each row execute procedure public.notify_upgrade_proposal();
-- VMG Teacher 360 · seed full academic resource catalogue
-- Source: VMG Teacher Resource Command Center supplied in this conversation.
insert into public.academic_resources(programme,stage,cefr,audience,name,category,workflow,priority,notes,url,sort_order) values
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Student Book (Sách học sinh)','Student Materials','Teach','Core','Software "Learn with Ollie"','https://drive.google.com/drive/folders/1y8w_ddtJA0sNoyca_4qO2oo7pqX_8K_J?usp=sharing',1),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Teacher Book (Sách cho giáo viên)','Teacher Materials','Prepare','Core','','https://drive.google.com/drive/folders/18Lu6fdCCBqtEQJ3uW8gLcPi2QsYC-RXh?usp=drive_link',2),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Lesson structure (Cấu trúc bài dạy)','Teacher Materials','Prepare','Core','','https://drive.google.com/file/d/1ADfDr2dBMh3TpOJBxlCWw_imCcZbTP_C/view?usp=drive_link',3),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Software (Phần mềm giảng dạy)','Teacher Materials','Prepare','Core','','https://drive.google.com/drive/folders/1y8w_ddtJA0sNoyca_4qO2oo7pqX_8K_J?usp=drive_link',4),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Added projects','Teacher Materials','Prepare','Core','','https://drive.google.com/drive/folders/1tXcN8Hpr0lkAVCsjCSfKZKf_KkJYv4Tf',5),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Midterm Test Report (Báo cáo thi giữa kì)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/folders/1kzDA1tKXchVM3Nl-CUoirlNPvq_aquJ4?usp=sharing',6),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Final Test Report (Báo cáo thi cuối kì)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/folders/1kzDA1tKXchVM3Nl-CUoirlNPvq_aquJ4?usp=sharing',7),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Course Outline (Phân phối chương trình)','Assessments & Exams','Assess','High priority','','https://docs.google.com/spreadsheets/d/1t6T_Hdf3NfryB1WBaj-oOZ8NMTYD3hyb/edit?usp=sharing&ouid=106958342997563211992&rtpof=true&sd=true',8),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Placement Test (Đề thi giấy)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/folders/1J4YvHSa1EaDvAtg_nOhLqBIgG2Tqdepe?usp=drive_link',9),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Speaking (Đề nói)','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/1NTnNimBrqrHrLm2DnuQP4m61JZGcwDaP/view?usp=drive_link',10),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','Speaking Test Guideline (Sách kiểm tra nói)','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/1NTnNimBrqrHrLm2DnuQP4m61JZGcwDaP/view?usp=drive_link',11),
('E-Pioneer','Early Years','Pre-A1','Ages 4–6','TEST','Assessments & Exams','Assess','High priority','MẪU GIÁO','https://drive.google.com/drive/folders/1RfwLZpkV8f-egq4RyHuE4664_ASCde_K',12),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','E-book','Student Materials','Teach','Core','Happy Camper books','https://mee.macmillaneducation.com/courses/courselist',13),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Student Book (Sách học sinh)','Student Materials','Teach','Core','Happy Campers 1 · Happy Campers 2','https://drive.google.com/file/d/1AOMnpbqJDFggG0Vkr4IeB_gTuDm8KJMq/view?usp=sharing',14),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Workbook (Sách hoạt động)','Student Materials','Teach','Core','Language Box HC 1 · Language Box HC 2','https://drive.google.com/file/d/15bqKKcZsKXdVkegrg5HcjOiN2awbaDir/view?usp=drive_link',15),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Teacher Book (Sách cho giáo viên)','Teacher Materials','Prepare','Core','Happy Campers 1 · Happy Campers 2','https://drive.google.com/file/d/1IeFS6t-_mSFDqmugYwhZzrAwwFxmJ1FA/view?usp=drive_link',16),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Flashcards (tranh ảnh)','Teacher Materials','Prepare','Core','Happy Campers 1 Flashcards · Happy Campers 2 Flashcards','https://drive.google.com/drive/folders/1riHtBmjDesO2l_Jb_ffKOwlHT6BvnXZd?usp=drive_link',17),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Midterm Test Report (Báo cáo thi giữa kì)','Assessments & Exams','Assess','High priority','E-Contender 1 · E-Contender 2 · E-Contender 3','https://drive.google.com/file/d/17sEKQxLHctQxvvso_whueJR1eabYOp6f/view?usp=drive_link',18),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Final Test Report (Báo cáo thi cuối kì)','Assessments & Exams','Assess','High priority','E-Contender 1 · E-Contender 2 · E-Contender 3','https://drive.google.com/file/d/18q3-jHQkB6p9Ir2uz-oVrbc3GgmRFx9Q/view?usp=drive_link',19),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Course Outline (Phân phối chương trình)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/folders/1wysizphdQs3Jpr870LwIihfZ1Lp2unUw?usp=sharing',20),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Added projects','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/folders/15WXuPxoOVSQISWNuEkrKjc9Q3F8b9qHE',21),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Placement Test (Đề thi giấy)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/folders/1TPKXVY1fis58DHJbK_35VJZpTTMTEwzd?usp=drive_link',22),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Listening (Đề nghe)','Assessments & Exams','Assess','High priority','E-Contender 1 · Midterm · Final','https://docs.google.com/document/d/15GF7znOyS0ofUA-lY-4fysbGCYmN_jZN/edit?usp=drive_link&ouid=106958342997563211992&rtpof=true&sd=true',23),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Listening Audio File (File nghe)','Assessments & Exams','Assess','High priority','E-Contender 1 · Midterm · Final','https://drive.google.com/drive/folders/1Uqe02ttxwFliLXbG4B7IyJFYUXjh-9_R?usp=drive_link',24),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Speaking (Đề nói)','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/1v1RwKUazcdtO6N3EiFgpRziFpkJP6BW_/view?usp=drive_link',25),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Speaking Test Guideline (Sách kiểm tra nói)','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/1v1RwKUazcdtO6N3EiFgpRziFpkJP6BW_/view?usp=drive_link',26),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Writing (Đề viết)','Assessments & Exams','Assess','High priority','E-Contender 1 · Midterm · Final','https://docs.google.com/document/d/15GF7znOyS0ofUA-lY-4fysbGCYmN_jZN/edit?usp=drive_link&ouid=106958342997563211992&rtpof=true&sd=true',27),
('E-Contender','Pre-primary','Pre-A1','Ages 5–6','Reading (Đề đọc)','Assessments & Exams','Assess','High priority','E-Contender 1 · Midterm · Final','https://docs.google.com/document/d/15GF7znOyS0ofUA-lY-4fysbGCYmN_jZN/edit?usp=drive_link&ouid=106958342997563211992&rtpof=true&sd=true',28),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','E-book','Student Materials','Teach','Core','Share it books','https://mee.macmillaneducation.com/courses/courselist',29),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Student Book (Sách học sinh)','Student Materials','Teach','Core','Share it 1 · Share it 2 · Share it 3','https://drive.google.com/file/d/12uGtphKY3rbFeCg3ZeaPmfQ_JbfOVnKs/view?usp=drive_link',30),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Workbook (Sách hoạt động)','Student Materials','Teach','Core','Share it 1 · Share it 2 · Share it 3','https://drive.google.com/file/d/1tgS2t7tJZdWIV7kS3JmkO86Q_Wr70HdD/view?usp=sharing',31),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Teacher Book (Sách cho giáo viên)','Teacher Materials','Prepare','Core','Share it 1 · Share it 2 · Share it 3','https://drive.google.com/file/d/1IedZqyPIelV9CJLBFL2XEhlLVsQefhjD/view?usp=drive_link',32),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Lesson structure (Cấu trúc bài dạy)','Teacher Materials','Prepare','Core','','https://docs.google.com/document/d/1nyOvguL4pE3spEr4w9gScsGlZ5FFqHsl/edit?usp=drive_link&ouid=106958342997563211992&rtpof=true&sd=true',33),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Unit tests, lesson worksheet (Các bài kiểm tra theo bài học, bài tập làm thêm)','Assessments & Exams','Assess','High priority','++++ Worksheets · Share it 1 · Share it 2','https://drive.google.com/file/d/1IedZqyPIelV9CJLBFL2XEhlLVsQefhjD/view?usp=drive_link',34),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Midterm Test Report (Báo cáo thi giữa kì)','Assessments & Exams','Assess','High priority','Starters 1 · Starters 2 · Starters 3','https://drive.google.com/file/d/1i0wxhOLVqOGnBUPzUoVdyTTJsF0xrJrN/view?usp=drive_link',35),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Final Test Report (Báo cáo thi cuối kì)','Assessments & Exams','Assess','High priority','Starters 1 · Starters 2 · Starters 3','https://drive.google.com/file/d/1hXrS3JOUFNoIcxoDBcIy4bSHAWjclVNL/view?usp=drive_link',36),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Course Outline (Phân phối hương trình)','Assessments & Exams','Assess','High priority','Starters 1 · Starters 2 · Starters 3','https://docs.google.com/spreadsheets/d/1BdVVhDTtD-wGtpEYWeqUjtkiH6HnzlBC/edit?usp=drive_link&ouid=106958342997563211992&rtpof=true&sd=true',37),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Placement Test (Đề thi giấy)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/folders/1PIQaEbYY_NVZySCv18KhGyhGg4yXG3-B?usp=sharing',38),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Listening (Đề nghe)','Assessments & Exams','Assess','High priority','Starters 1 · Midterm · Final','https://drive.google.com/file/d/1YXJDWOA0dpP3J2kDFvP2DLImeEv6o_mn/view?usp=drive_link',39),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Listening Audio File (File nghe)','Assessments & Exams','Assess','High priority','Starters 1 · Midterm · Final','https://drive.google.com/drive/folders/119RGn9iuf5u415aYV03dHgVfl2H3YyTr?usp=drive_link',40),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Speaking (Đề nói)','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/1v1RwKUazcdtO6N3EiFgpRziFpkJP6BW_/view?usp=drive_link',41),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Speaking Test Guideline (Sách kiểm tra nói)','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/1v1RwKUazcdtO6N3EiFgpRziFpkJP6BW_/view?usp=drive_link',42),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Writing (Đề viết)','Assessments & Exams','Assess','High priority','Starters 1 · Midterm · Final','https://drive.google.com/file/d/1YXJDWOA0dpP3J2kDFvP2DLImeEv6o_mn/view?usp=drive_link',43),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Reading (Đề đọc)','Assessments & Exams','Assess','High priority','Starters 1 · Midterm · Final','https://drive.google.com/file/d/1YXJDWOA0dpP3J2kDFvP2DLImeEv6o_mn/view?usp=drive_link',44),
('E-Genius','Primary','Pre-A1–A2','Ages 6–11','Paper Test (Đề thi giấy)','Assessments & Exams','Assess','High priority','Starters 1 · Midterm · Final','https://drive.google.com/file/d/1YXJDWOA0dpP3J2kDFvP2DLImeEv6o_mn/view?usp=drive_link',45),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Student Book (Sách học sinh)','Student Materials','Teach','Core','Gold Experience · or 2 · Skillful','https://login.pearson.com/v1/piapi/piui/signin?client_id=bWPoUiRnLpUhX2rhGeP4AaLCeyQYNYDA',46),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Workbook (Sách hoạt động)','Student Materials','Teach','Core','Gold Experience · Skillful 1 - 2','https://login.pearson.com/v1/piapi/piui/signin?client_id=bWPoUiRnLpUhX2rhGeP4AaLCeyQYNYDA',47),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Teacher Book (Sách cho giáo viên)','Teacher Materials','Prepare','Core','Gold Experience · Skillful 1 - 2 (teacher presentation kit)','https://login.pearson.com/v1/piapi/piui/signin?client_id=bWPoUiRnLpUhX2rhGeP4AaLCeyQYNYDA',48),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Lesson structure (Cấu trúc bài dạy)','Teacher Materials','Prepare','Core','IELTS Milestone & Premier','https://drive.google.com/drive/folders/1TTpWgPVrF1QqKwlXe_ggBK1X8Fpb0WXJ?usp=sharing',49),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Add-on lesson (Giáo án các bài bổ trợ)','Teacher Materials','Prepare','Core','','https://drive.google.com/drive/folders/1UOOrPTNPL1v2bumSJdqOTZEN5OxD8dRD?usp=sharing',50),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','IELTS EXPERT AUDIO','Teacher Materials','Prepare','Core','Gold Experience: GOLD EXPERIENCE · Skillful Foundation R&W: AUDIO - SKILLFUL FOUNDATION - READING & WRITING · Skillful Foundation L&S','https://drive.google.com/drive/folders/1L_2Ybhf97sLOn7qMWBewUbuNovtp0qXV',51),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Course Outline (Phân phối chương trình)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/folders/1Giv1fqg5R9XKTkcg2BrKibUrPPpF52-Z?usp=sharing',52),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Test review (Premier to Milestone 5)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/4/folders/1fnnxJpr6Dz9id6FzCqUOTd64HTKLbVYV',53),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Placement Test (Đề thi giấy)','Assessments & Exams','Assess','High priority','Placement test 1 · Placement test 2 (full - LISTENING) · Placement test 2 (full - WRITING)','https://drive.google.com/file/d/1AlPGtQ0CST0LejYTqgIL76sPTSmMDG1m/view?usp=sharing',54),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Listening (Đề nghe)','Assessments & Exams','Assess','High priority','Onset 1A · Midterm · Final','https://docs.google.com/document/d/1msAgQVnEL04gsZiUfRpNOZe_25Quesor/edit?usp=drive_link&ouid=106958342997563211992&rtpof=true&sd=true',55),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Listening Audio File (File nghe)','Assessments & Exams','Assess','High priority','Onset 1A · Midterm · Final','https://drive.google.com/drive/folders/1-h3fq66tkMnwaBDVoTCAABST6oE73A6y?usp=sharing',56),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Speaking (Đề nói)','Assessments & Exams','Assess','High priority','Onset 1A · Midterm · Final','https://docs.google.com/document/d/1sXB2mXwJfoyWhLXBcXC_38VWV3mie8n2/edit?usp=sharing&ouid=106958342997563211992&rtpof=true&sd=true',57),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Speaking Test Guideline (Hướng dẫn kiểm tra nói)','Assessments & Exams','Assess','High priority','Onset · Premier · Milestone 4.0','https://drive.google.com/file/d/187CWu__2IBsAewA4MfV6Q5mb19G7bWxc/view?usp=sharing',58),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Writing (Đề viết)','Assessments & Exams','Assess','High priority','Onset 1A · Midterm · Final','https://docs.google.com/document/d/1nUMfcO81HXUxPiWpJ2Tatohju_UT-g3y/edit?usp=drive_link&ouid=106958342997563211992&rtpof=true&sd=true',59),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Writing Rurbic (Thang điểm viết)','Assessments & Exams','Assess','High priority','Onset · Premier · Mistone 4','https://drive.google.com/file/d/1wZ0AseN1rwXT15_8h39xrJ-eHKsnFoLB/view?usp=sharing',60),
('NextGen IELTS','Teens','A2–B2','Ages 12–17','Reading (Đề đọc)','Assessments & Exams','Assess','High priority','Onset 1A · Midterm · Final','https://docs.google.com/document/d/1msAgQVnEL04gsZiUfRpNOZe_25Quesor/edit?usp=drive_link&ouid=106958342997563211992&rtpof=true&sd=true',61),
('IELTS Express','IELTS','B1–C1','Teens & adults','Workbook (Sách hoạt động)','Student Materials','Teach','Core','Oxford25','https://q3e.oxfordonlinepractice.com/app/dashboard',62),
('IELTS Express','IELTS','B1–C1','Teens & adults','Teacher Book (Sách cho giáo viên)','Teacher Materials','Prepare','Core','Qskill · vmg.academic@vmg.edu.vn','https://englishhub.oup.com/',63),
('IELTS Express','IELTS','B1–C1','Teens & adults','Course Outline (Phân phối chương trình)','Assessments & Exams','Assess','High priority','01. COURSE OUTLINE','https://drive.google.com/drive/u/1/folders/1hvsxq53XojihR2Ih6BN6TtEXQKyFWoPm',64),
('E-Plus','Adults','A1–B2','Ages 17+','Student Book , Teacher''s book and all supporting materials','Student Materials','Teach','Core','','https://drive.google.com/drive/u/4/folders/1K02Yxs7a098bJHydLZOixCVVBXGrOdJb',65),
('E-Plus','Adults','A1–B2','Ages 17+','Course outline (Phân phối chương trình)','Student Materials','Teach','Core','','https://docs.google.com/spreadsheets/d/1g-XRZzX1fEajU5wtTUc06ORZFGecnLnE/edit?usp=sharing&ouid=112706894806454417064&rtpof=true&sd=true',66),
('E-Plus','Adults','A1–B2','Ages 17+','Presentation/Role-play (các buổi thuyết trình, đóng vai)','Student Materials','Teach','Core','','https://drive.google.com/drive/u/4/folders/12HH9-YAdu7GSoGef8u9uvN3jE5FJe6Cf',67),
('E-Plus','Adults','A1–B2','Ages 17+','Mid-term test','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/1EjqngFSEMXG47RZy_-V3zxi4hZlimD0w/view?usp=sharing',68),
('E-Plus','Adults','A1–B2','Ages 17+','Final test','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/1XNMgvPzcUW7uKjcoPAkaOsC0SaknPZgz/view?usp=sharing',69),
('E-Plus','Adults','A1–B2','Ages 17+','Student Book (Sách học sinh)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/19XyRJebdNsVcZ5faGR9HOFLFE7UgSWLc',70),
('E-Plus','Adults','A1–B2','Ages 17+','Course outline (Phân phối chương trình)','Assessments & Exams','Assess','High priority','','https://docs.google.com/spreadsheets/d/1GUW4qf2lFDLVJUcetRye4dFxtN1O0zk7JMR-O6ywHYI/edit?usp=sharing',71),
('E-Plus','Adults','A1–B2','Ages 17+','Presentation/Role-play (các buổi thuyết trình, đóng vai)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/1rWsQeWN7agPQIjuOXGZoZDutb4AlCKdB',72),
('E-Plus','Adults','A1–B2','Ages 17+','Mid-term test','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/1XUm7Ow69M3Uif0cf_4gS-AJ2W26Xkm8R',73),
('E-Plus','Adults','A1–B2','Ages 17+','Final test','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/1XUm7Ow69M3Uif0cf_4gS-AJ2W26Xkm8R',74),
('E-Plus','Adults','A1–B2','Ages 17+','Student Book (Sách học sinh)','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/136exr8HApr75qikP6iiN2XsDjMNtEokV/view?usp=drive_link',75),
('E-Plus','Adults','A1–B2','Ages 17+','Course outline (Phân phối chương trình)','Assessments & Exams','Assess','High priority','','https://docs.google.com/spreadsheets/d/1fzdbpZbYlOcSrOeNL0Gc6eb3nOzfdjf-K7B4_qSRHpw/edit?usp=sharing',76),
('E-Plus','Adults','A1–B2','Ages 17+','Presentation/Role-play (các buổi thuyết trình, đóng vai)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/157jWelWU_w1Ty32G81PDHjtiAABFAn6h',77),
('E-Plus','Adults','A1–B2','Ages 17+','Mid-term test','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/199FrcyHRv5OCcJdsmSUbDcSEpOrf-Qnd',78),
('E-Plus','Adults','A1–B2','Ages 17+','Final test','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/199FrcyHRv5OCcJdsmSUbDcSEpOrf-Qnd',79),
('E-Plus','Adults','A1–B2','Ages 17+','Student Book (Sách học sinh)','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/17ybFNLGHI0hFYyf96s999xpxnVTJHMt5/view?usp=drive_link',80),
('E-Plus','Adults','A1–B2','Ages 17+','Course outline (Phân phối chương trình)','Assessments & Exams','Assess','High priority','','https://docs.google.com/spreadsheets/d/1qMegWEMlQBnjg2YjADyNOlfv-AEbn_Sby6rPm0oYz4g/edit?usp=sharing',81),
('E-Plus','Adults','A1–B2','Ages 17+','Presentation/Role-play (các buổi thuyết trình, đóng vai)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/13oOcnL72GLv1Xa4jtmJpuFQkUt9kJ2Re',82),
('E-Plus','Adults','A1–B2','Ages 17+','Mid-term test','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/1gt-jTr4DwVGe093euAoO-06EMm_nQ2ht',83),
('E-Plus','Adults','A1–B2','Ages 17+','Final test','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/1gt-jTr4DwVGe093euAoO-06EMm_nQ2ht',84),
('E-Plus','Adults','A1–B2','Ages 17+','Student Book (Sách học sinh)','Assessments & Exams','Assess','High priority','','https://drive.google.com/file/d/1y7s9FZxWFpIekHU8xNxsLtYYKv-3MRtD/view?usp=drive_link',85),
('E-Plus','Adults','A1–B2','Ages 17+','Course outline (Phân phối chương trình)','Assessments & Exams','Assess','High priority','','https://docs.google.com/spreadsheets/d/1lre5ZalfI5bKxJg1gfeF53BkJXauHTVX0usSHpND1oI/edit?usp=sharing',86),
('E-Plus','Adults','A1–B2','Ages 17+','Presentation/Role-play (các buổi thuyết trình, đóng vai)','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/folders/1JVF3zDeizzbYdliHfW6kG-FnJ4Bxqjyq?usp=sharing',87),
('E-Plus','Adults','A1–B2','Ages 17+','Mid-term test','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/1zO-Tb0PlqI_YxslF4aOvq1uO8y-OSkEA',88),
('E-Plus','Adults','A1–B2','Ages 17+','Final test','Assessments & Exams','Assess','High priority','','https://drive.google.com/drive/u/0/folders/1zO-Tb0PlqI_YxslF4aOvq1uO8y-OSkEA',89),
('Summer & Enrichment','Seasonal','Mixed','K–12','Overview','General','Prepare','Reference','Overview','https://drive.google.com/drive/u/4/folders/1UbpvNS8GeswDi9zEftBZJX-VwxoesFbO',90),
('Summer & Enrichment','Seasonal','Mixed','K–12','Student Book & Workbook (Sách bài học và sách bài tập)','Student Materials','Teach','Core','Level 1 · Level 2','https://drive.google.com/drive/u/4/folders/12oSy4g7jzNuP5EZ4grf3GhYjt4SxfkAi',91),
('Summer & Enrichment','Seasonal','Mixed','K–12','Teacher Book (Sách cho giáo viên)','Teacher Materials','Prepare','Core','Teacher''s notes 1 · Teacher''s notes 2','https://drive.google.com/file/d/1wjTXbJ329P-Sj0QSmf-49Mb32ZU4GYXO/view?usp=drive_link',92),
('Summer & Enrichment','Seasonal','Mixed','K–12','Course Outline','Assessments & Exams','Assess','High priority','Level 1 · Level 2','https://docs.google.com/spreadsheets/d/1a3_FkaedUtLVWie7Bc3v8xPoogcrws7F/edit?usp=sharing&ouid=112706894806454417064&rtpof=true&sd=true',93),
('Summer & Enrichment','Seasonal','Mixed','K–12','Student Book (Sách học sinh)','Student Materials','Teach','Core','Level 1+2 · Flipbook platform · Log-in ID: vmg.academic@vmg.edu.vn','https://www.oxfordlearnersbookshelf.com/home/main.html?state=qJ3NaIzm0JFgaUdame91714038231185',94),
('Summer & Enrichment','Seasonal','Mixed','K–12','Flashcards','Student Materials','Teach','Core','Level 1 · Level 2','https://drive.google.com/file/d/1gVz9EcQbL08dRefmxUTdq0JKhiukWfVr/view?usp=drive_link',95),
('Summer & Enrichment','Seasonal','Mixed','K–12','Teacher Book (Sách cho giáo viên)','Teacher Materials','Prepare','Core','Level 1 · Level 2','https://drive.google.com/file/d/1ai6BQENTA5N_L2QTfwYgnt_QyaAHOqK0/view?usp=drive_link',96),
('Summer & Enrichment','Seasonal','Mixed','K–12','Course Outline','Assessments & Exams','Assess','High priority','Level 1 · Level 2','https://docs.google.com/spreadsheets/d/1qIzEuJGIGfZ-2RCyyzhdEzU5ovQFD9oB/edit?usp=drive_link&ouid=106958342997563211992&rtpof=true&sd=true',97),
('Summer & Enrichment','Seasonal','Mixed','K–12','Lesson plan (Giáo án giảng dạy)','Teacher Materials','Prepare','Core','Session 1 · Session 2 · Session 3','https://docs.google.com/document/d/1SdApPGr1J_rnf7n6tbTQgYu7xNxF-efZNcxX3x7QeWI/edit?usp=drive_link',98),
('Summer & Enrichment','Seasonal','Mixed','K–12','Course Outline','Assessments & Exams','Assess','High priority','','https://docs.google.com/spreadsheets/d/1cU2YbPkWyakO9nhZB_cTmNXTKsjbap1mqmZjTwlxtXA/edit?usp=drive_link',99),
('Summer & Enrichment','Seasonal','Mixed','K–12','Lesson plan (Giáo án giảng dạy)','Teacher Materials','Prepare','Core','Session 1 · Session 2 · Session 3','https://docs.google.com/document/d/1hBfEtXMdDkzZHgLkZbQJe25GwmxDJvdfYKQjjoaxnik/edit?usp=drive_link',100),
('Summer & Enrichment','Seasonal','Mixed','K–12','Course Outline','Assessments & Exams','Assess','High priority','','https://docs.google.com/spreadsheets/d/1NWQQg0Fv256qnhMGAgqo4MZW__H895tHe9Ur5gRbofU/edit?usp=drive_link',101),
('B2B / B2G','Institutional','Mixed','School cohorts','Student Book (Sách học sinh)','Student Materials','Teach','Core','English Discovery · Explore our world · Family and friends (National edition)','https://drive.google.com/drive/folders/1mQlI749NjMQb-UY-qsdXJjaK3zEFAIsr?usp=sharing',102),
('B2B / B2G','Institutional','Mixed','School cohorts','Workbook (Sách hoạt động)','Student Materials','Teach','Core','+++ Term 1 · English Discovery · Family and Friends (National)','https://drive.google.com/drive/folders/1dMLW9YissgFjoSZCHb_-CIIPcub2D-Qz?usp=drive_link',103),
('B2B / B2G','Institutional','Mixed','School cohorts','Teacher Book (Sách cho giáo viên)','Teacher Materials','Prepare','Core','Global Success · I-learn Smart World','https://drive.google.com/drive/folders/17f0Z1bcWB_XJ-MU7Sv79dcwH3cK23zYI?usp=drive_link',104),
('B2B / B2G','Institutional','Mixed','School cohorts','Add-on lesson plans (Các bài học bổ trợ)','Teacher Materials','Prepare','Core','+++ Term 1 · Cambridge Practice · Family and Friends (National)','https://drive.google.com/drive/folders/1IcSPYD46E5FUU4p8arZGMoukfA7dvOlQ?usp=sharing',105),
('B2B / B2G','Institutional','Mixed','School cohorts','Listening Audio File (File nghe)','Assessments & Exams','Assess','High priority','+++ Midterm · + Family & Friends (Simplified) · Grade 1','https://drive.google.com/file/d/1NubSWHuWwFjLqsZNTjE-4AfT3aX1VhU0/view?usp=drive_link',106),
('B2B / B2G','Institutional','Mixed','School cohorts','Speaking (Đề nói)','Assessments & Exams','Assess','High priority','+++ Midterm · Grade 1 · _ Family & Friends; GS, I-learn Smart start','https://docs.google.com/document/d/1sBsEgUJphwI3qAxCn9MBdHid142qH5aCDYIP2CTei3Y/edit?usp=sharing',107),
('B2B / B2G','Institutional','Mixed','School cohorts','Speaking Test Guidelines & rubric (Hướng dẫn chấm thi nói)','Assessments & Exams','Assess','High priority','Grade 1 · Grade 2 · Grade 3','https://docs.google.com/document/d/1nu2qAeacweiieMDyczp4y5vFkwksDEr8TZzMN4e_1g8/edit?usp=drive_link',108),
('B2B / B2G','Institutional','Mixed','School cohorts','Paper Test (Đề thi giấy)','Assessments & Exams','Assess','High priority','+++ Midterm · + Family & Friends (Simplified) · Grade 1','https://drive.google.com/file/d/1hGs9_JJ6FZd3f99gsptTD3_w8DjWpaCy/view?usp=drive_link',109)
on conflict(programme,name,url) do update set
  stage=excluded.stage,
  cefr=excluded.cefr,
  audience=excluded.audience,
  category=excluded.category,
  workflow=excluded.workflow,
  priority=excluded.priority,
  notes=excluded.notes,
  sort_order=excluded.sort_order,
  is_active=true,
  updated_at=now();