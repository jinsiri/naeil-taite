-- A job has one application; analysis snapshots never own its current stage.
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_posting_id uuid not null unique,
  pipeline_stage text check (pipeline_stage in ('검토중','지원준비','지원완료','서류통과','서류탈락','1차면접','2차면접','처우협의','최종합격','최종탈락')),
  legacy_stage text check (legacy_stage in ('검토중','지원준비','지원완료','서류통과','서류탈락','1차면접','2차면접','처우협의','최종합격','최종탈락')),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (job_posting_id, user_id) references public.job_postings(id, user_id) on delete cascade,
  check (pipeline_stage is not null or legacy_stage is not null)
);
create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  application_id uuid not null,
  revision integer not null,
  from_stage text,
  pipeline_stage text,
  change_reason text not null,
  created_at timestamptz not null default now(),
  foreign key (application_id, user_id) references public.applications(id, user_id) on delete cascade,
  unique (application_id, revision)
);
create index application_events_owner_application_idx on public.application_events(user_id, application_id, revision desc);
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
create policy applications_read_own on public.applications for select to authenticated using (user_id = (select auth.uid()));
create policy application_events_read_own on public.application_events for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.applications, public.application_events from anon, authenticated;
grant select on public.applications, public.application_events to authenticated;

-- Keep old reviews intact. Even the latest stage may have come from a reanalysis
-- or rollback, so it is only a suggestion pending user confirmation.
insert into public.applications(user_id, job_posting_id, pipeline_stage, legacy_stage)
select j.user_id, j.id, case when r.id is null then '검토중' end, r.pipeline_stage
from public.job_postings j left join lateral (
  select id, pipeline_stage from public.job_reviews where job_posting_id = j.id
  order by created_at desc, id desc limit 1
) r on true;
insert into public.application_events(user_id, application_id, revision, pipeline_stage, change_reason)
select user_id, id, revision, pipeline_stage,
  case when pipeline_stage is null then '기존 평가의 지원 단계 확인 필요' else '지원 기록 생성' end
from public.applications;

create function public.create_job_application() returns trigger
language plpgsql security definer set search_path = '' as $$
declare application_id uuid;
begin
  insert into public.applications(user_id, job_posting_id, pipeline_stage)
    values (new.user_id, new.id, '검토중') returning id into application_id;
  insert into public.application_events(user_id, application_id, revision, pipeline_stage, change_reason)
    values (new.user_id, application_id, 1, '검토중', '지원 기록 생성');
  return new;
end;
$$;
revoke all on function public.create_job_application() from public, anon, authenticated;
create trigger job_application_created after insert on public.job_postings
for each row execute function public.create_job_application();

create function public.set_application_stage(p_job_id uuid, p_expected_revision integer, p_stage text, p_confirmed_apply boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.applications%rowtype;
begin
  select * into target from public.applications where job_posting_id = p_job_id and user_id = auth.uid() for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND' using errcode = '42501'; end if;
  if p_expected_revision is distinct from target.revision then raise exception 'VERSION_CONFLICT' using errcode = '40001'; end if;
  if p_stage is null or p_stage not in ('검토중','지원준비','지원완료','서류통과','서류탈락','1차면접','2차면접','처우협의','최종합격','최종탈락') then
    raise exception 'INVALID_STAGE' using errcode = '22023'; end if;
  if p_stage = '지원완료' and p_confirmed_apply is distinct from true then
    raise exception 'APPLY_CONFIRMATION_REQUIRED' using errcode = '22023'; end if;
  if target.pipeline_stage = p_stage then return target.id; end if;
  update public.applications set pipeline_stage = p_stage, revision = revision + 1, updated_at = now() where id = target.id;
  insert into public.application_events(user_id, application_id, revision, from_stage, pipeline_stage, change_reason)
    values (target.user_id, target.id, target.revision + 1, target.pipeline_stage, p_stage,
      case when target.pipeline_stage is null then '기존 지원 단계 확인: ' || p_stage
      else '지원 단계 변경: ' || target.pipeline_stage || ' → ' || p_stage end);
  return target.id;
end;
$$;
revoke all on function public.set_application_stage(uuid, integer, text, boolean) from public, anon;
grant execute on function public.set_application_stage(uuid, integer, text, boolean) to authenticated;

-- Pick latest per job BEFORE pagination. Respect underlying table RLS.
create view public.application_overview with (security_invoker = true) as
select a.*, j.title, j.company, j.deadline, j.created_at as job_created_at,
  (select to_jsonb(r) from public.job_reviews r where r.job_posting_id = a.job_posting_id
   order by r.created_at desc, r.id desc limit 1) as latest_review
from public.applications a join public.job_postings j on j.id = a.job_posting_id;
revoke all on public.application_overview from anon, authenticated;
grant select on public.application_overview to authenticated;
