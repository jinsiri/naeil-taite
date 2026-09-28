create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  company text not null default '' check (char_length(company) <= 120),
  source_url text not null default '' check (
    char_length(source_url) <= 2000 and
    (source_url = '' or source_url ~* '^https?://')
  ),
  deadline date,
  original_text text not null check (char_length(btrim(original_text)) between 20 and 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index job_postings_owner_created_idx
  on public.job_postings(user_id, created_at desc);

alter table public.job_postings enable row level security;
create policy job_postings_read_own on public.job_postings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy job_postings_insert_own on public.job_postings
  for insert to authenticated with check ((select auth.uid()) = user_id);
revoke all on public.job_postings from anon, authenticated;
grant select, insert on public.job_postings to authenticated;
