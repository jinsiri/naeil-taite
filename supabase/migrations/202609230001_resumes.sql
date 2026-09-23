-- All mutations go through transactional functions. Clients can only read their rows.
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_version integer not null default 1 check (current_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null,
  user_id uuid not null,
  version integer not null check (version > 0),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  content text not null check (char_length(content) between 1 and 100000 and content ~ '\S'),
  change_note text not null default '' check (char_length(change_note) <= 500),
  file_id uuid,
  file_name text,
  file_size integer,
  restored_from_version integer,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (resume_id, user_id) references public.resumes(id, user_id) on delete cascade,
  unique (resume_id, version),
  check ((file_id is null and file_name is null and file_size is null) or
    (file_id is not null and file_name is not null and char_length(file_name) between 1 and 255 and file_size between 1 and 10485760))
);
create index resumes_owner_updated_idx on public.resumes(user_id, updated_at desc);
create index resume_versions_owner_idx on public.resume_versions(user_id, resume_id, version desc);

alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
create policy resumes_read_own on public.resumes for select to authenticated using ((select auth.uid()) = user_id);
create policy resume_versions_read_own on public.resume_versions for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.resumes, public.resume_versions from anon, authenticated;
grant select on public.resumes, public.resume_versions to authenticated;

-- Lock the parent row to serialize version allocation and detect stale editors.
create function public.save_resume(
  p_resume_id uuid, p_expected_version integer, p_title text, p_content text,
  p_change_note text default '', p_file_id uuid default null,
  p_file_name text default null, p_file_size integer default null,
  p_restore_version integer default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  target_id uuid := p_resume_id;
  previous integer;
  next_version integer;
  source public.resume_versions%rowtype;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if target_id is null then
    if p_expected_version <> 0 or p_expected_version is null or p_restore_version is not null then
      raise exception 'INVALID_VERSION' using errcode = '22023';
    end if;
    insert into public.resumes(user_id) values(owner_id) returning id into target_id;
    next_version := 1;
  else
    select current_version into previous from public.resumes
      where id = target_id and user_id = owner_id for update;
    if not found then raise exception 'NOT_FOUND' using errcode = '42501'; end if;
    if p_expected_version is distinct from previous then raise exception 'VERSION_CONFLICT' using errcode = '40001'; end if;
    next_version := previous + 1;
  end if;
  if p_restore_version is not null then
    select * into source from public.resume_versions where resume_id = target_id
      and user_id = owner_id and version = p_restore_version;
    if not found then raise exception 'NOT_FOUND' using errcode = '22023'; end if;
    p_title := source.title; p_content := source.content;
    p_file_id := source.file_id; p_file_name := source.file_name; p_file_size := source.file_size;
    p_change_note := 'v' || p_restore_version || '에서 복원';
  elsif previous is not null and p_file_id is null then
    select * into source from public.resume_versions where resume_id = target_id and version = previous;
    p_file_id := source.file_id; p_file_name := source.file_name; p_file_size := source.file_size;
  end if;
  insert into public.resume_versions(resume_id, user_id, version, title, content, change_note, file_id, file_name, file_size, restored_from_version)
    values(target_id, owner_id, next_version, btrim(p_title), p_content, coalesce(p_change_note, ''), p_file_id, p_file_name, p_file_size, p_restore_version);
  update public.resumes set current_version = next_version, updated_at = now() where id = target_id;
  return target_id;
end;
$$;
revoke all on function public.save_resume(uuid, integer, text, text, text, uuid, text, integer, integer) from public, anon;
grant execute on function public.save_resume(uuid, integer, text, text, text, uuid, text, integer, integer) to authenticated;
