-- Avoid ambiguity with storage.objects.owner_id when validating a stored original.
-- Preserve existing ownership checks, row locks, RLS and immutable versions.
create or replace function public.save_resume(
  p_resume_id uuid, p_expected_version integer, p_title text, p_content text,
  p_change_note text default '', p_file_id uuid default null,
  p_file_name text default null, p_file_size integer default null,
  p_restore_version integer default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  resume_owner_id uuid := auth.uid();
  target_id uuid := p_resume_id;
  previous integer;
  next_version integer;
  source public.resume_versions%rowtype;
  attachment public.resume_files%rowtype;
begin
  if resume_owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if target_id is null then
    if p_expected_version <> 0 or p_expected_version is null or p_restore_version is not null then
      raise exception 'INVALID_VERSION' using errcode = '22023';
    end if;
    insert into public.resumes(user_id) values(resume_owner_id) returning id into target_id;
    next_version := 1;
  else
    select current_version into previous from public.resumes
      where id = target_id and user_id = resume_owner_id for update;
    if not found then raise exception 'NOT_FOUND' using errcode = '42501'; end if;
    if p_expected_version is distinct from previous then raise exception 'VERSION_CONFLICT' using errcode = '40001'; end if;
    next_version := previous + 1;
  end if;
  if p_restore_version is not null then
    select * into source from public.resume_versions where resume_id = target_id
      and user_id = resume_owner_id and version = p_restore_version;
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
      where id = p_file_id and user_id = resume_owner_id for update;
    if not found or attachment.state not in ('pending', 'attached') then
      raise exception 'INVALID_ATTACHMENT' using errcode = '42501';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'resume-originals'
      and name = resume_owner_id::text || '/' || p_file_id::text
      and (metadata->>'size')::bigint = attachment.size) then
      raise exception 'UPLOAD_INCOMPLETE' using errcode = '22023';
    end if;
    p_file_name := attachment.name;
    p_file_size := attachment.size;
    update public.resume_files set state = 'attached' where id = p_file_id;
  end if;
  insert into public.resume_versions(resume_id, user_id, version, title, content, change_note, file_id, file_name, file_size, restored_from_version)
    values(target_id, resume_owner_id, next_version, btrim(p_title), p_content, coalesce(p_change_note, ''), p_file_id, p_file_name, p_file_size, p_restore_version);
  update public.resumes set current_version = next_version, updated_at = now() where id = target_id;
  return target_id;
end;
$$;
revoke all on function public.save_resume(uuid, integer, text, text, text, uuid, text, integer, integer) from public, anon;
grant execute on function public.save_resume(uuid, integer, text, text, text, uuid, text, integer, integer) to authenticated;

