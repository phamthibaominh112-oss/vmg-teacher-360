-- VMG Teacher 360 V11 · Readable + Connected workspace
-- Run once AFTER V10_SCOPE_AND_ACCOUNTS.sql.
-- Adds self-service teacher documents, profile photos and broader notification routing.

begin;

-- ---------------------------------------------------------------------------
-- 1) Profile photos
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_path text;

insert into storage.buckets(id,name,public)
values('profile-photos','profile-photos',false)
on conflict(id) do update set public=false;

create or replace function public.set_my_avatar(new_path text) returns void
language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if new_path is null or split_part(new_path,'/',1) <> auth.uid()::text then
    raise exception 'Avatar path must belong to the signed-in user';
  end if;
  update public.profiles set avatar_path=new_path,updated_at=now() where id=auth.uid();
end $$;
grant execute on function public.set_my_avatar(text) to authenticated;

-- Internal profile photos are readable only after sign-in. Users upload only to their own folder.
drop policy if exists "profile_photos_read" on storage.objects;
drop policy if exists "profile_photos_upload_self" on storage.objects;
drop policy if exists "profile_photos_delete_admin" on storage.objects;
create policy "profile_photos_read" on storage.objects
  for select to authenticated using (bucket_id='profile-photos');
create policy "profile_photos_upload_self" on storage.objects
  for insert to authenticated with check (
    bucket_id='profile-photos'
    and array_length(storage.foldername(name),1)>=1
    and (storage.foldername(name))[1]=auth.uid()::text
  );
create policy "profile_photos_delete_admin" on storage.objects
  for delete to authenticated using (bucket_id='profile-photos' and public.is_delete_admin());

-- ---------------------------------------------------------------------------
-- 2) Teacher self-service document inbox
-- ---------------------------------------------------------------------------
create table if not exists public.teacher_document_submissions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  file_path text not null,
  file_name text not null,
  note text,
  submitted_by uuid not null references public.profiles(id),
  status text not null default 'submitted' check (status in ('submitted','verified','needs_revision')),
  hr_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teacher_document_submissions_teacher_idx on public.teacher_document_submissions(teacher_id,created_at desc);
create index if not exists teacher_document_submissions_status_idx on public.teacher_document_submissions(status,created_at desc);

alter table public.teacher_document_submissions enable row level security;

drop policy if exists "document_submissions_read" on public.teacher_document_submissions;
drop policy if exists "document_submissions_insert" on public.teacher_document_submissions;
drop policy if exists "document_submissions_update_hr" on public.teacher_document_submissions;
drop policy if exists "document_submissions_delete_admin" on public.teacher_document_submissions;
create policy "document_submissions_read" on public.teacher_document_submissions
  for select to authenticated using (teacher_id=auth.uid() or public.can_view_teacher(teacher_id));
create policy "document_submissions_insert" on public.teacher_document_submissions
  for insert to authenticated with check (
    (teacher_id=auth.uid() and submitted_by=auth.uid())
    or (public.current_vmg_role()::text in ('ptns','rnd','bod') and public.can_view_teacher(teacher_id))
  );
create policy "document_submissions_update_hr" on public.teacher_document_submissions
  for update to authenticated using (public.current_vmg_role()::text in ('ptns','rnd','bod') and public.can_view_teacher(teacher_id))
  with check (public.current_vmg_role()::text in ('ptns','rnd','bod') and public.can_view_teacher(teacher_id));
create policy "document_submissions_delete_admin" on public.teacher_document_submissions
  for delete to authenticated using (public.is_delete_admin());

-- Allow a teacher to upload files into their own teacher-documents folder.
drop policy if exists "documents_upload_hr" on storage.objects;
drop policy if exists "documents_upload_scoped" on storage.objects;
create policy "documents_upload_scoped" on storage.objects
  for insert to authenticated with check (
    bucket_id='teacher-documents'
    and array_length(storage.foldername(name),1)>=1
    and (
      (storage.foldername(name))[1]=auth.uid()::text
      or public.current_vmg_role()::text in ('ptns','rnd','bod')
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Notification routing helper
-- ---------------------------------------------------------------------------
create or replace function public.notify_teacher_network(
  target_teacher uuid,
  n_title text,
  n_body text,
  n_kind text,
  n_link text,
  include_teacher boolean default true,
  ho_roles text[] default array['rnd','bod']::text[]
) returns void
language plpgsql security definer set search_path=public
as $$
declare
  tr_region smallint;
  tr_centre text;
begin
  select region_no,home_centre_code into tr_region,tr_centre from public.profiles where id=target_teacher;
  insert into public.notifications(user_id,title,body,kind,link_target)
  select distinct p.id,n_title,n_body,n_kind,n_link
  from public.profiles p
  where p.is_active=true and (
    (include_teacher and p.id=target_teacher)
    or (p.role::text in ('cmo','centre_director') and tr_centre is not null and p.home_centre_code=tr_centre)
    or (p.role::text='regional_director' and tr_region is not null and p.region_no=tr_region)
    or p.role::text=any(ho_roles)
  );
end $$;

-- Observation results: teacher + centre + region + academic / governance roles.
create or replace function public.notify_observation_result() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if new.status='finalized' and (tg_op='INSERT' or old.status is distinct from new.status) then
    perform public.notify_teacher_network(
      new.teacher_id,
      'Observation result published',
      coalesce(new.observation_type,'Observation') || ' · Score ' || coalesce(new.final_score::text,'—') || '. ' || coalesce(left(new.smart_action,180),left(new.improvement_areas,180),'Review the feedback in your portfolio.'),
      'observation_result','observations',true,
      array['rnd','bod','academic_supervisor']::text[]
    );
  end if;
  return new;
end $$;
drop trigger if exists observation_result_notifications on public.observations;
create trigger observation_result_notifications after insert or update on public.observations
for each row execute procedure public.notify_observation_result();

-- Document submissions: HR receives immediately; teacher receives confirmation / review result.
create or replace function public.notify_document_submission() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if tg_op='INSERT' then
    insert into public.notifications(user_id,title,body,kind,link_target)
    select p.id,'New teacher document submitted',coalesce(t.full_name,'Teacher') || ' · ' || new.document_type || ' · ' || new.file_name,'document_submission','documents'
    from public.profiles p
    left join public.profiles t on t.id=new.teacher_id
    where p.is_active=true and p.role::text in ('ptns','rnd','bod');

    insert into public.notifications(user_id,title,body,kind,link_target)
    values(new.teacher_id,'Document received by HR',new.file_name || ' has been submitted for verification.','document_received','documents');
  elsif old.status is distinct from new.status then
    insert into public.notifications(user_id,title,body,kind,link_target)
    values(new.teacher_id,
      case when new.status='verified' then 'Document verified' else 'Document needs an update' end,
      new.file_name || case when new.status='verified' then ' has been verified by HR.' else ' needs an update. ' || coalesce(new.hr_note,'Please review the HR note.') end,
      'document_review','documents');
  end if;
  return new;
end $$;
drop trigger if exists document_submission_notifications on public.teacher_document_submissions;
create trigger document_submission_notifications after insert or update on public.teacher_document_submissions
for each row execute procedure public.notify_document_submission();

-- Announcements should surface both in the dashboard and inbox for the correct scope.
create or replace function public.notify_announcement_published() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.notifications(user_id,title,body,kind,link_target)
  select p.id,
         coalesce(new.title_en,new.title_vi,'VMG announcement'),
         coalesce(new.body_en,new.body_vi,''),
         'announcement','bulletin'
  from public.profiles p
  where p.is_active=true
    and (new.target_region_no is null or p.region_no=new.target_region_no or p.role::text in ('rnd','bod','ptns','academic_supervisor','csr'))
    and (new.target_centre_code is null or p.home_centre_code=new.target_centre_code or p.role::text in ('rnd','bod','ptns','academic_supervisor','csr'));
  return new;
end $$;
drop trigger if exists announcement_published_notifications on public.announcements;
create trigger announcement_published_notifications after insert on public.announcements
for each row execute procedure public.notify_announcement_published();

-- Performance snapshots should reach the teacher and their leadership scope.
create or replace function public.notify_kpi_snapshot() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  perform public.notify_teacher_network(
    new.teacher_id,'Performance snapshot updated',
    'Composite ' || coalesce(new.composite_score::text,'—') || ' · Observation ' || coalesce(new.observation_score::text,'—') || ' · HVR ' || coalesce(new.hvr_pct::text,'—'),
    'performance_snapshot','performance',true,array['rnd','bod','ptns']::text[]
  );
  return new;
end $$;
drop trigger if exists kpi_snapshot_notifications on public.teacher_kpi_snapshots;
create trigger kpi_snapshot_notifications after insert or update on public.teacher_kpi_snapshots
for each row execute procedure public.notify_kpi_snapshot();

-- Expand incident approval routing to the teacher's centre and region leadership too.
create or replace function public.notify_incident_approval() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if old.director_approved_at is null and new.director_approved_at is not null then
    perform public.notify_teacher_network(
      new.teacher_id,'Teacher case approved',
      coalesce(new.case_code,new.id::text) || ' · ' || new.title,
      'incident_approved','incidents',true,array['rnd','bod','ptns','csr']::text[]
    );
  end if;
  return new;
end $$;

-- Training creation: targeted teachers + centre/region leaders + development functions.
create or replace function public.notify_training_created() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.notifications(user_id,title,body,kind,link_target)
  select distinct p.id,'New training scheduled',new.title || ' · ' || to_char(new.starts_at at time zone 'Asia/Ho_Chi_Minh','DD Mon YYYY HH24:MI'),'training_scheduled','training'
  from public.profiles p
  where p.is_active=true and (
    p.role::text in ('rnd','bod','academic_supervisor','ptns')
    or (p.role::text='regional_director' and (new.target_region_no is null or p.region_no=new.target_region_no))
    or (p.role::text in ('cmo','centre_director') and (new.target_region_no is null or p.region_no=new.target_region_no) and (new.target_centre_code is null or p.home_centre_code=new.target_centre_code))
    or (p.role::text='teacher' and (new.target_region_no is null or p.region_no=new.target_region_no) and (new.target_centre_code is null or p.home_centre_code=new.target_centre_code))
  );
  return new;
end $$;

-- Teacher event: teacher + their local / regional leaders and academic owners.
create or replace function public.notify_teacher_event() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if new.teacher_id is not null then
    perform public.notify_teacher_network(
      new.teacher_id,'Teacher development event booked',
      new.title || ' · ' || to_char(new.starts_at at time zone 'Asia/Ho_Chi_Minh','DD Mon YYYY HH24:MI'),
      'teacher_event','training',true,array['rnd','bod','academic_supervisor']::text[]
    );
  end if;
  return new;
end $$;

-- Upgrade decisions are visible to the teacher + management chain.
create or replace function public.notify_upgrade_decision() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if old.status is distinct from new.status and new.status in ('approved','rejected') then
    perform public.notify_teacher_network(
      new.teacher_id,
      case when new.status='approved' then 'Professional level update approved' else 'Professional level proposal reviewed' end,
      case when new.status='approved' then 'Approved level: ' || new.proposed_level else 'The proposal was not approved. ' || coalesce(new.review_note,'') end,
      'upgrade_decision','upgrades',true,array['rnd','bod','academic_supervisor','ptns']::text[]
    );
  end if;
  return new;
end $$;
drop trigger if exists upgrade_decision_notifications on public.upgrade_recommendations;
create trigger upgrade_decision_notifications after update on public.upgrade_recommendations
for each row execute procedure public.notify_upgrade_decision();

commit;
