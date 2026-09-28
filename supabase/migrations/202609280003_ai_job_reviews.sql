alter table public.job_reviews
  add column ai_analysis jsonb,
  add column ai_consent_at timestamptz,
  add constraint job_reviews_ai_consent_pair_check check (
    (ai_analysis is null and ai_consent_at is null) or
    (ai_analysis is not null and ai_consent_at is not null)
  );

drop function public.save_job_review(uuid, uuid, integer, jsonb, integer, integer, text, text, integer, text, text, text, uuid);

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
  p_rollback_source_id uuid,
  p_ai_analysis jsonb,
  p_ai_consent_at timestamptz
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  latest public.job_reviews%rowtype;
  next_number integer;
  frozen_pass integer;
  new_id uuid;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if (p_ai_analysis is null) <> (p_ai_consent_at is null) then
    raise exception 'AI_CONSENT_REQUIRED' using errcode = '22023';
  end if;
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
    application_effort, pipeline_stage, pass_at_apply, ai_analysis, ai_consent_at
  ) values (
    owner_id, p_job_posting_id, p_resume_id, p_resume_version, next_number,
    latest.id, p_rollback_source_id, p_change_reason, p_scores,
    p_opportunity_score, p_pass_estimate, p_career_path, p_category,
    p_priority_score, p_application_effort, p_pipeline_stage, frozen_pass,
    p_ai_analysis, p_ai_consent_at
  ) returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.save_job_review(uuid, uuid, integer, jsonb, integer, integer, text, text, integer, text, text, text, uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.save_job_review(uuid, uuid, integer, jsonb, integer, integer, text, text, integer, text, text, text, uuid, jsonb, timestamptz) to authenticated;
