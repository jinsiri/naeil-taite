alter table public.resume_files add constraint resume_files_id_owner_unique unique(id, user_id);
create table public.submitted_resumes (
  id uuid primary key,
  user_id uuid not null,
  application_id uuid not null,
  submitted_on date not null,
  source_kind text not null check (source_kind in ('file','text')),
  resume_id uuid,
  resume_version integer,
  title text not null,
  content text,
  file_id uuid,
  file_name text,
  file_size integer,
  note text not null default '' check (char_length(note) <= 500),
  approved_at timestamptz not null default now(),
  foreign key (application_id, user_id) references public.applications(id, user_id) on delete cascade,
  foreign key (resume_id, user_id) references public.resumes(id, user_id),
  foreign key (resume_id, resume_version) references public.resume_versions(resume_id, version),
  foreign key (file_id, user_id) references public.resume_files(id, user_id),
  check ((source_kind = 'file' and file_id is not null and file_name is not null and file_size is not null and content is null and resume_id is null and resume_version is null)
    or (source_kind = 'text' and file_id is null and file_name is null and file_size is null and content is not null and resume_id is not null and resume_version is not null))
);
create index submitted_resumes_owner_application_idx on public.submitted_resumes(user_id, application_id, approved_at desc);
alter table public.submitted_resumes enable row level security;
create policy submitted_resumes_read_own on public.submitted_resumes for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.submitted_resumes from anon, authenticated;
grant select on public.submitted_resumes to authenticated;

create function public.confirm_submitted_resume(p_id uuid, p_application_id uuid, p_submitted_on date, p_kind text, p_resume_id uuid, p_resume_version integer, p_file_id uuid, p_note text, p_approved boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target public.applications%rowtype;
  source_version public.resume_versions%rowtype;
  attachment public.resume_files%rowtype;
  previous public.submitted_resumes%rowtype;
begin
  if p_approved is distinct from true then raise exception 'APPROVAL_REQUIRED' using errcode = '22023'; end if;
  if p_submitted_on is null or p_submitted_on > (now() at time zone 'Asia/Seoul')::date
    or p_id is null or p_kind is null or p_kind not in ('file','text') or p_note is null or char_length(p_note) > 500 then
    raise exception 'INVALID_SUBMISSION' using errcode = '22023'; end if;
  select * into target from public.applications where id = p_application_id and user_id = auth.uid() for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND' using errcode = '42501'; end if;
  -- Retry the same confirmation without creating another snapshot.
  select * into previous from public.submitted_resumes where id = p_id;
  if found then
    if previous.user_id = target.user_id and previous.application_id = target.id
      and previous.submitted_on = p_submitted_on and previous.source_kind = p_kind
      and previous.resume_id is not distinct from p_resume_id and previous.resume_version is not distinct from p_resume_version
      and previous.file_id is not distinct from p_file_id and previous.note = p_note then return previous.id; end if;
    raise exception 'REQUEST_CONFLICT' using errcode = '22023';
  end if;
  if p_kind = 'text' then
    if p_file_id is not null then raise exception 'INVALID_SOURCE' using errcode = '22023'; end if;
    select * into source_version from public.resume_versions where resume_id = p_resume_id and version = p_resume_version and user_id = target.user_id;
    if not found then raise exception 'VERSION_NOT_FOUND' using errcode = '42501'; end if;
    insert into public.submitted_resumes(id,user_id,application_id,submitted_on,source_kind,resume_id,resume_version,title,content,note)
      values(p_id,target.user_id,target.id,p_submitted_on,p_kind,source_version.resume_id,source_version.version,source_version.title,source_version.content,p_note);
  else
    if p_resume_id is not null or p_resume_version is not null then raise exception 'INVALID_SOURCE' using errcode = '22023'; end if;
    select * into attachment from public.resume_files where id = p_file_id and user_id = target.user_id for update;
    if not found or attachment.state not in ('pending','attached') then raise exception 'FILE_NOT_AVAILABLE' using errcode = '42501'; end if;
    if not exists(select 1 from storage.objects where bucket_id = 'resume-originals'
      and name = target.user_id::text || '/' || attachment.id::text and (metadata->>'size')::bigint = attachment.size) then
      raise exception 'UPLOAD_INCOMPLETE' using errcode = '22023'; end if;
    update public.resume_files set state = 'attached' where id = attachment.id;
    insert into public.submitted_resumes(id,user_id,application_id,submitted_on,source_kind,file_id,file_name,file_size,title,note)
      values(p_id,target.user_id,target.id,p_submitted_on,p_kind,attachment.id,attachment.name,attachment.size,attachment.name,p_note);
  end if;
  return p_id;
end;
$$;
revoke all on function public.confirm_submitted_resume(uuid,uuid,date,text,uuid,integer,uuid,text,boolean) from public, anon;
grant execute on function public.confirm_submitted_resume(uuid,uuid,date,text,uuid,integer,uuid,text,boolean) to authenticated;
