create table public.job_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_posting_id uuid not null,
  resume_id uuid not null,
  resume_version integer not null check (resume_version > 0),
  snapshot_number integer not null check (snapshot_number > 0),
  parent_review_id uuid references public.job_reviews(id),
  rollback_source_id uuid references public.job_reviews(id),
  change_reason text not null check (char_length(btrim(change_reason)) between 5 and 500),
  scores jsonb not null check (
    jsonb_typeof(scores) = 'object' and
    jsonb_typeof(scores->'companyQuality') = 'number' and (scores->>'companyQuality')::integer between 0 and 100 and
    jsonb_typeof(scores->'roleFit') = 'number' and (scores->>'roleFit')::integer between 0 and 100 and
    jsonb_typeof(scores->'careerCapital') = 'number' and (scores->>'careerCapital')::integer between 0 and 100 and
    jsonb_typeof(scores->'targetAlignment') = 'number' and (scores->>'targetAlignment')::integer between 0 and 100 and
    jsonb_typeof(scores->'personalFit') = 'number' and (scores->>'personalFit')::integer between 0 and 100
  ),
  opportunity_score integer not null check (opportunity_score between 0 and 100),
  pass_estimate integer not null check (pass_estimate between 0 and 100),
  career_path text not null check (career_path in ('DIRECT', 'BRIDGE', 'OPTION', 'REPEAT', 'DETOUR')),
  category text not null check (category in ('우선지원', '상향지원', '안정지원', '후순위')),
  priority_score integer not null check (priority_score between 0 and 100),
  application_effort text not null check (application_effort in ('Low', 'Medium', 'High')),
  pipeline_stage text not null check (pipeline_stage in ('검토중', '지원준비', '지원완료', '서류통과', '서류탈락', '1차면접', '2차면접', '처우협의', '최종합격', '최종탈락')),
  pass_at_apply integer check (pass_at_apply between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key (job_posting_id, user_id) references public.job_postings(id, user_id) on delete cascade,
  foreign key (resume_id, user_id) references public.resumes(id, user_id) on delete cascade,
  foreign key (resume_id, resume_version) references public.resume_versions(resume_id, version),
  unique (job_posting_id, resume_id, resume_version, snapshot_number)
);

create index job_reviews_owner_latest_idx
  on public.job_reviews(user_id, created_at desc);
create index job_reviews_job_latest_idx
  on public.job_reviews(user_id, job_posting_id, created_at desc);

alter table public.job_reviews enable row level security;
create policy job_reviews_read_own on public.job_reviews
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.job_reviews from anon, authenticated;
grant select on public.job_reviews to authenticated;

create function public.save_job_review(
  p_job_posting_id uuid,
  p_resume_id uuid,
  p_resume_version integer,
  p_scores jsonb,
  p_opportunity_score integer,
  p_pass_estimate integer,
  p_career_path text,
  p_category text,
  p_priority_score integer,
  p_application_effort text,
  p_pipeline_stage text,
  p_change_reason text,
  p_rollback_source_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  latest public.job_reviews%rowtype;
  next_number integer;
  frozen_pass integer;
  new_id uuid;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform 1 from public.job_postings
    where id = p_job_posting_id and user_id = owner_id for update;
  if not found then raise exception 'JOB_NOT_FOUND' using errcode = '42501'; end if;
  perform 1 from public.resume_versions
    where resume_id = p_resume_id and version = p_resume_version and user_id = owner_id;
  if not found then raise exception 'RESUME_VERSION_NOT_FOUND' using errcode = '42501'; end if;

  select * into latest from public.job_reviews
    where job_posting_id = p_job_posting_id and resume_id = p_resume_id
      and resume_version = p_resume_version and user_id = owner_id
    order by snapshot_number desc limit 1;
  next_number := coalesce(latest.snapshot_number, 0) + 1;
  if latest.id is null then
    if p_pipeline_stage not in ('검토중', '지원준비') then
      frozen_pass := p_pass_estimate;
    end if;
  elsif latest.pass_at_apply is not null then
    frozen_pass := latest.pass_at_apply;
  elsif latest.pipeline_stage in ('검토중', '지원준비')
    and p_pipeline_stage not in ('검토중', '지원준비') then
    frozen_pass := latest.pass_estimate;
  end if;

  insert into public.job_reviews (
    user_id, job_posting_id, resume_id, resume_version, snapshot_number,
    parent_review_id, rollback_source_id, change_reason, scores,
    opportunity_score, pass_estimate, career_path, category, priority_score,
    application_effort, pipeline_stage, pass_at_apply
  ) values (
    owner_id, p_job_posting_id, p_resume_id, p_resume_version, next_number,
    latest.id, p_rollback_source_id, p_change_reason, p_scores,
    p_opportunity_score, p_pass_estimate, p_career_path, p_category,
    p_priority_score, p_application_effort, p_pipeline_stage, frozen_pass
  ) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.save_job_review(uuid, uuid, integer, jsonb, integer, integer, text, text, integer, text, text, text, uuid) from public, anon;
grant execute on function public.save_job_review(uuid, uuid, integer, jsonb, integer, integer, text, text, integer, text, text, text, uuid) to authenticated;
