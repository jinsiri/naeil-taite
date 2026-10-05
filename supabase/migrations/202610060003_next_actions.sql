create table public.next_actions (
  id uuid primary key,
  user_id uuid not null,
  application_id uuid not null,
  source_reflection_id uuid references public.application_reflections(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  note text not null default '' check (char_length(note) <= 2000),
  due_on date,
  completed_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (application_id, user_id) references public.applications(id, user_id) on delete cascade
);
create index next_actions_owner_due_idx on public.next_actions(user_id, due_on, id) where completed_at is null;
create index next_actions_application_idx on public.next_actions(user_id, application_id, created_at desc);
alter table public.next_actions enable row level security;
create policy next_actions_read_own on public.next_actions for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.next_actions from anon, authenticated;
grant select on public.next_actions to authenticated;

create function public.save_next_action(p_id uuid, p_application_id uuid, p_expected_revision integer, p_title text, p_note text, p_due_on date, p_completed boolean, p_source_reflection_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare app public.applications%rowtype; target public.next_actions%rowtype;
begin
  select * into app from public.applications where id = p_application_id and user_id = auth.uid() for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND' using errcode = '42501'; end if;
  if p_id is null or p_expected_revision is null or p_expected_revision < 0 or p_completed is null or p_title is null or char_length(btrim(p_title)) not between 1 and 160 or p_note is null or char_length(p_note) > 2000 then
    raise exception 'INVALID_ACTION' using errcode = '22023'; end if;
  if p_source_reflection_id is not null and not exists(select 1 from public.application_reflections where id = p_source_reflection_id and user_id = app.user_id and job_posting_id = app.job_posting_id) then
    raise exception 'REFLECTION_NOT_FOUND' using errcode = '42501'; end if;
  select * into target from public.next_actions where id = p_id for update;
  if found then
    if target.user_id <> app.user_id or target.application_id <> app.id then raise exception 'ACTION_NOT_FOUND' using errcode = '42501'; end if;
    if p_expected_revision = 0 and target.revision = 1 and target.title = btrim(p_title) and target.note = p_note
      and target.due_on is not distinct from p_due_on and (target.completed_at is not null) = p_completed
      and target.source_reflection_id is not distinct from p_source_reflection_id then return target.id; end if;
    if target.revision <> p_expected_revision then raise exception 'VERSION_CONFLICT' using errcode = '40001'; end if;
    if target.source_reflection_id is distinct from p_source_reflection_id then raise exception 'SOURCE_IMMUTABLE' using errcode = '22023'; end if;
    update public.next_actions set title = btrim(p_title), note = p_note, due_on = p_due_on,
      completed_at = case when p_completed then coalesce(completed_at, now()) end,
      revision = revision + 1, updated_at = now() where id = target.id;
  else
    if p_expected_revision <> 0 then raise exception 'ACTION_NOT_FOUND' using errcode = '42501'; end if;
    insert into public.next_actions(id,user_id,application_id,source_reflection_id,title,note,due_on,completed_at)
      values(p_id,app.user_id,app.id,p_source_reflection_id,btrim(p_title),p_note,p_due_on,case when p_completed then now() end);
  end if;
  return p_id;
end;
$$;
revoke all on function public.save_next_action(uuid,uuid,integer,text,text,date,boolean,uuid) from public, anon;
grant execute on function public.save_next_action(uuid,uuid,integer,text,text,date,boolean,uuid) to authenticated;
