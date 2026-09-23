-- Run after migrations against a disposable DB or local Supabase. Always rolls back.
begin;
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('test.resume_id', public.save_resume(null, 0, '첫 이력서', 'React 경험. Next.js 미확인.', '최초 등록', '20000000-0000-4000-8000-000000000001', 'original.pdf', 128)::text, true);
select public.save_resume(current_setting('test.resume_id')::uuid, 1, '수정 이력서', '직접 수정한 내용', '경력 추가');
select public.save_resume(current_setting('test.resume_id')::uuid, 2, '', '', p_restore_version => 1);
do $$
begin
  if (select current_version from public.resumes where id = current_setting('test.resume_id')::uuid) <> 3 then raise exception 'Wrong current version'; end if;
  if (select count(*) from public.resume_versions) <> 3 then raise exception 'Missing snapshots'; end if;
  if (select content from public.resume_versions where version = 1) <> 'React 경험. Next.js 미확인.' then raise exception 'Original changed'; end if;
  if (select content from public.resume_versions where version = 3) <> 'React 경험. Next.js 미확인.' then raise exception 'Restore failed'; end if;
  if (select file_id from public.resume_versions where version = 2) is distinct from '20000000-0000-4000-8000-000000000001'::uuid then raise exception 'Attachment lost'; end if;
  if (select restored_from_version from public.resume_versions where version = 3) <> 1 then raise exception 'Missing restore audit'; end if;
  begin
    perform public.save_resume(current_setting('test.resume_id')::uuid, 1, 'stale', 'stale');
    raise exception 'Stale writer accepted';
  exception when serialization_failure then null; end;
  begin
    update public.resume_versions set content = 'overwrite' where version = 1;
    raise exception 'Snapshot update accepted';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.resume_versions where version = 1;
    raise exception 'Snapshot delete accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_resume(null, 0, '', 'invalid');
    raise exception 'Invalid input accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.resumes) <> 1 then raise exception 'Failed transaction left parent row'; end if;
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists(select 1 from public.resumes) or exists(select 1 from public.resume_versions) then raise exception 'Cross-user read'; end if;
  begin
    perform public.save_resume(current_setting('test.resume_id')::uuid, 3, 'attacker', 'attacker');
    raise exception 'Cross-user update';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_resume(current_setting('test.resume_id')::uuid, 3, '', '', p_restore_version => 1);
    raise exception 'Cross-user restore';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  begin
    perform public.save_resume(null, 0, 'anonymous', 'anonymous');
    raise exception 'Missing identity accepted';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$
begin
  begin
    perform public.save_resume(null, 0, 'anonymous', 'anonymous');
    raise exception 'Anonymous function access';
  exception when insufficient_privilege then null; end;
  begin
    perform count(*) from public.resumes;
    raise exception 'Anonymous table access';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
