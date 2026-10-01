create table public.application_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_posting_id uuid not null,
  pipeline_stage text not null check (pipeline_stage in (
    '검토중', '지원준비', '지원완료', '서류통과', '서류탈락',
    '1차면접', '2차면접', '처우협의', '최종합격', '최종탈락'
  )),
  positive_note text not null default '' check (char_length(positive_note) <= 2000),
  improvement_note text not null default '' check (char_length(improvement_note) <= 2000),
  next_time_note text not null default '' check (char_length(next_time_note) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (job_posting_id, user_id)
    references public.job_postings(id, user_id) on delete cascade,
  check (
    char_length(btrim(positive_note)) +
    char_length(btrim(improvement_note)) +
    char_length(btrim(next_time_note)) > 0
  )
);

create index application_reflections_job_created_idx
  on public.application_reflections(user_id, job_posting_id, created_at desc);

alter table public.application_reflections enable row level security;
create policy application_reflections_read_own on public.application_reflections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy application_reflections_insert_own on public.application_reflections
  for insert to authenticated with check ((select auth.uid()) = user_id);
revoke all on public.application_reflections from anon, authenticated;
grant select, insert on public.application_reflections to authenticated;
