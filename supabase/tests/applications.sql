begin;
insert into auth.users(id) values ('60000000-0000-4000-8000-000000000001'), ('60000000-0000-4000-8000-000000000002');
insert into public.job_postings(id,user_id,title,original_text) values
 ('60000000-0000-4000-8000-000000000011','60000000-0000-4000-8000-000000000001','독립 지원 테스트','React와 TypeScript 경험을 가진 개발자를 찾습니다.');
insert into public.resumes(id,user_id,current_version) values ('60000000-0000-4000-8000-000000000021','60000000-0000-4000-8000-000000000001',2);
insert into public.resume_versions(resume_id,user_id,version,title,content) values
 ('60000000-0000-4000-8000-000000000021','60000000-0000-4000-8000-000000000001',1,'v1','React 경험'),
 ('60000000-0000-4000-8000-000000000021','60000000-0000-4000-8000-000000000001',2,'v2','React 경험 추가');
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
do $$
begin
  if (select pipeline_stage from public.applications) <> '검토중' then raise exception 'Application missing without AI'; end if;
  begin
    perform public.set_application_stage('60000000-0000-4000-8000-000000000011',1,'지원완료',false);
    raise exception 'Missing confirmation accepted';
  exception when invalid_parameter_value then null; end;
  perform public.set_application_stage('60000000-0000-4000-8000-000000000011',1,'지원완료',true);
  begin
    perform public.set_application_stage('60000000-0000-4000-8000-000000000011',1,'검토중',false);
    raise exception 'Stale update accepted';
  exception when serialization_failure then null; end;
  begin
    update public.applications set pipeline_stage = '검토중';
    raise exception 'Direct mutation accepted';
  exception when insufficient_privilege then null; end;
end $$;
-- New analysis for a different version and a rollback-like review cannot change application state.
select public.save_job_review('60000000-0000-4000-8000-000000000011','60000000-0000-4000-8000-000000000021',2,
 '{"companyQuality":70,"roleFit":70,"careerCapital":70,"targetAlignment":70,"personalFit":70}',70,60,'DIRECT','우선지원',70,'Medium','검토중','새 버전 재분석',null,null,null);
select public.save_job_review('60000000-0000-4000-8000-000000000011','60000000-0000-4000-8000-000000000021',1,
 '{"companyQuality":70,"roleFit":70,"careerCapital":70,"targetAlignment":70,"personalFit":70}',70,60,'DIRECT','우선지원',70,'Medium','검토중','과거 평가 복원',null,null,null);
do $$ begin
  if (select pipeline_stage from public.applications) <> '지원완료' then raise exception 'Review mutated application'; end if;
  if (select count(*) from public.application_events) <> 2 then raise exception 'Unexpected application events'; end if;
  if (select count(*) from public.application_overview) <> 1 then raise exception 'Duplicate overview'; end if;
end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.applications) or exists(select 1 from public.application_events) or exists(select 1 from public.application_overview) then raise exception 'Cross-user read'; end if;
  begin
    perform public.set_application_stage('60000000-0000-4000-8000-000000000011',2,'검토중',false);
    raise exception 'Cross-user mutation';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Simulate an unconfirmed migrated stage and verify explicit confirmation creates an event.
update public.applications set pipeline_stage = null, legacy_stage = '지원완료';
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
select public.set_application_stage('60000000-0000-4000-8000-000000000011',2,'지원완료',true);
do $$ begin
  if (select revision from public.applications) <> 3 then raise exception 'Legacy confirmation not recorded'; end if;
end $$;
rollback;
