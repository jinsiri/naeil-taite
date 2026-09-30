alter table public.job_postings
  add column work_location text not null default '' check (char_length(work_location) <= 160);
create policy job_postings_update_work_location_own on public.job_postings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant update (work_location) on public.job_postings to authenticated;

create table public.scoring_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weights jsonb not null default '{"careerCapital":25,"roleFit":25,"companyQuality":20,"targetAlignment":20,"personalFit":10,"publicTransitFit":10}'::jsonb,
  home_district text not null default '' check (char_length(home_district) <= 80),
  commute_ideal_minutes integer not null default 30 check (commute_ideal_minutes between 0 and 240),
  commute_max_minutes integer not null default 90 check (commute_max_minutes between 1 and 300),
  transit_consent boolean not null default false,
  updated_at timestamptz not null default now(),
  check (commute_max_minutes > commute_ideal_minutes),
  check (jsonb_typeof(weights) = 'object')
);

alter table public.scoring_preferences enable row level security;
create policy scoring_preferences_read_own on public.scoring_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy scoring_preferences_insert_own on public.scoring_preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy scoring_preferences_update_own on public.scoring_preferences
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.scoring_preferences from anon, authenticated;
grant select, insert, update on public.scoring_preferences to authenticated;
