-- Originals are immutable; only explicitly discarded, unattached uploads can be deleted.
create table public.resume_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 255),
  size integer not null check (size between 1 and 10485760),
  state text not null default 'pending' check (state in ('pending', 'attached', 'discarded', 'deleted', 'legacy')),
  created_at timestamptz not null default now()
);
alter table public.resume_files enable row level security;
revoke all on public.resume_files from anon, authenticated;
grant select, insert on public.resume_files to authenticated;
create policy resume_files_read_own on public.resume_files for select to authenticated
  using (user_id = (select auth.uid()));
create policy resume_files_insert_own on public.resume_files for insert to authenticated
  with check (user_id = (select auth.uid()) and state = 'pending'
    and lower(name) ~ '\.(pdf|docx|txt)$');

-- Preserve IDs and historical version records. A local migration tool copies the bytes.
insert into public.resume_files(id, user_id, name, size, state)
select distinct on (file_id) file_id, user_id, file_name, file_size, 'legacy'
from public.resume_versions where file_id is not null order by file_id, created_at;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('resume-originals', 'resume-originals', false, 10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy resume_originals_read on storage.objects for select to authenticated
  using (bucket_id = 'resume-originals' and exists (
    select 1 from public.resume_files f where f.user_id = (select auth.uid())
      and storage.objects.name = f.user_id::text || '/' || f.id::text));
-- Hold the same row lock as discard/save until the upload metadata commits.
create function public.can_upload_resume_original(p_name text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare upload_state text;
begin
  select state into upload_state from public.resume_files
    where user_id = auth.uid() and p_name = user_id::text || '/' || id::text for update;
  return coalesce(upload_state = 'pending', false);
end;
$$;
revoke all on function public.can_upload_resume_original(text) from public, anon;
grant execute on function public.can_upload_resume_original(text) to authenticated;
create policy resume_originals_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'resume-originals' and public.can_upload_resume_original(name));
create policy resume_originals_delete_discarded on storage.objects for delete to authenticated
  using (bucket_id = 'resume-originals' and exists (
    select 1 from public.resume_files f where f.user_id = (select auth.uid())
      and f.state = 'discarded' and storage.objects.name = f.user_id::text || '/' || f.id::text));
-- No UPDATE policy: upserts cannot overwrite any original.

create function public.discard_resume_upload(p_file_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare attachment public.resume_files%rowtype;
begin
  select * into attachment from public.resume_files
    where id = p_file_id and user_id = auth.uid() for update;
  if not found or attachment.state not in ('pending', 'discarded', 'deleted') then
    raise exception 'CANNOT_DISCARD_ATTACHMENT' using errcode = '42501';
  end if;
  if exists (select 1 from public.resume_versions where file_id = p_file_id) then
    raise exception 'ATTACHMENT_IN_USE' using errcode = '42501';
  end if;
  if attachment.state <> 'deleted' then
    update public.resume_files set state = 'discarded' where id = p_file_id;
  end if;
end;
$$;
revoke all on function public.discard_resume_upload(uuid) from public, anon;
grant execute on function public.discard_resume_upload(uuid) to authenticated;

create or replace function public.save_resume(
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
  attachment public.resume_files%rowtype;
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
  -- Serialize attachment finalization with explicit discard. Inherited/restored
  -- legacy files remain valid without requiring an upload during a text edit.
  if p_file_id is not null and p_restore_version is null
     and (source.file_id is null or source.file_id is distinct from p_file_id) then
    select * into attachment from public.resume_files
      where id = p_file_id and user_id = owner_id for update;
    if not found or attachment.state not in ('pending', 'attached') then
      raise exception 'INVALID_ATTACHMENT' using errcode = '42501';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'resume-originals'
      and name = owner_id::text || '/' || p_file_id::text
      and (metadata->>'size')::bigint = attachment.size) then
      raise exception 'UPLOAD_INCOMPLETE' using errcode = '22023';
    end if;
    p_file_name := attachment.name;
    p_file_size := attachment.size;
    update public.resume_files set state = 'attached' where id = p_file_id;
  end if;
  insert into public.resume_versions(resume_id, user_id, version, title, content, change_note, file_id, file_name, file_size, restored_from_version)
    values(target_id, owner_id, next_version, btrim(p_title), p_content, coalesce(p_change_note, ''), p_file_id, p_file_name, p_file_size, p_restore_version);
  update public.resumes set current_version = next_version, updated_at = now() where id = target_id;
  return target_id;
end;
$$;
revoke all on function public.save_resume(uuid, integer, text, text, text, uuid, text, integer, integer) from public, anon;
grant execute on function public.save_resume(uuid, integer, text, text, text, uuid, text, integer, integer) to authenticated;

-- Record completed removal only after Storage has deleted the object.
create function public.finish_discard_resume_upload(p_file_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.resume_files where id = p_file_id and user_id = auth.uid()
    and state in ('discarded', 'deleted') for update;
  if not found then raise exception 'NOT_DISCARDED' using errcode = '42501'; end if;
  if exists (select 1 from storage.objects where bucket_id = 'resume-originals'
    and name = auth.uid()::text || '/' || p_file_id::text) then
    raise exception 'REMOVAL_INCOMPLETE' using errcode = '22023';
  end if;
  update public.resume_files set state = 'deleted' where id = p_file_id;
end;
$$;
revoke all on function public.finish_discard_resume_upload(uuid) from public, anon;
grant execute on function public.finish_discard_resume_upload(uuid) to authenticated;
