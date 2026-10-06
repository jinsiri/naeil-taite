-- User-entered annual gross salary, in 10,000 KRW units. Multiple changes in
-- the same year are retained; comparisons use the preceding calendar year's latest record.
create table public.salary_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_on date not null check (effective_on between date '0001-01-01' and date '9999-12-31'),
  career_year integer not null check (career_year between 1 and 60),
  company text not null default '' check (char_length(company) <= 100),
  amount integer not null check (amount between 1 and 1000000),
  note text not null default '' check (char_length(note) <= 1000),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index salary_records_owner_idx on public.salary_records(user_id,id);
alter table public.salary_records enable row level security;
create policy salary_records_read_own on public.salary_records for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.salary_records from anon, authenticated;
grant select on public.salary_records to authenticated;

create function public.save_salary_record(p_id uuid,p_expected_revision integer,p_effective_on date,p_career_year integer,p_company text,p_amount integer,p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target public.salary_records%rowtype;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_id is null then raise exception 'INVALID_INPUT' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 0));
  select * into target from public.salary_records where id = p_id for update;
  if found then
    if target.user_id <> actor then raise exception 'NOT_FOUND' using errcode = '42501'; end if;
    if p_expected_revision = 0 and target.revision = 1 and
      row(target.effective_on,target.career_year,target.company,target.amount,target.note)
      is not distinct from row(p_effective_on,p_career_year,btrim(p_company),p_amount,btrim(p_note)) then return target.id; end if;
    if target.revision <> p_expected_revision then raise exception 'VERSION_CONFLICT' using errcode = '40001'; end if;
    update public.salary_records set effective_on=p_effective_on,career_year=p_career_year,company=btrim(p_company),amount=p_amount,note=btrim(p_note),revision=revision+1,updated_at=now() where id = target.id;
  else
    if p_expected_revision <> 0 then raise exception 'NOT_FOUND' using errcode = '42501'; end if;
    insert into public.salary_records(id,user_id,effective_on,career_year,company,amount,note)
      values(p_id,actor,p_effective_on,p_career_year,btrim(p_company),p_amount,btrim(p_note));
  end if;
  return p_id;
end;
$$;
revoke all on function public.save_salary_record(uuid,integer,date,integer,text,integer,text) from public, anon;
grant execute on function public.save_salary_record(uuid,integer,date,integer,text,integer,text) to authenticated;

create function public.delete_salary_record(p_id uuid,p_expected_revision integer,p_approved boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.salary_records%rowtype;
begin
  if p_approved is distinct from true then raise exception 'APPROVAL_REQUIRED' using errcode = '22023'; end if;
  select * into target from public.salary_records where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'NOT_FOUND' using errcode = '42501'; end if;
  if p_expected_revision is distinct from target.revision then raise exception 'VERSION_CONFLICT' using errcode = '40001'; end if;
  delete from public.salary_records where id=target.id;
end;
$$;
revoke all on function public.delete_salary_record(uuid,integer,boolean) from public, anon;
grant execute on function public.delete_salary_record(uuid,integer,boolean) to authenticated;
