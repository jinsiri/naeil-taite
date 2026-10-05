begin;
insert into auth.users(id) values ('61000000-0000-4000-8000-000000000001'),('61000000-0000-4000-8000-000000000002');
insert into public.job_postings(id,user_id,title,original_text) values ('61000000-0000-4000-8000-000000000011','61000000-0000-4000-8000-000000000001','제출본 테스트','React와 TypeScript 경험을 가진 개발자를 찾습니다.');
insert into public.resumes(id,user_id,current_version) values ('61000000-0000-4000-8000-000000000021','61000000-0000-4000-8000-000000000001',1);
insert into public.resume_versions(resume_id,user_id,version,title,content) values ('61000000-0000-4000-8000-000000000021','61000000-0000-4000-8000-000000000001',1,'제출 본문','제출한 본문 원문');
insert into public.resume_files(id,user_id,name,size,state) values
 ('61000000-0000-4000-8000-000000000031','61000000-0000-4000-8000-000000000001','submitted.pdf',100,'pending'),
 ('61000000-0000-4000-8000-000000000032','61000000-0000-4000-8000-000000000002','other.pdf',100,'pending'),
 ('61000000-0000-4000-8000-000000000033','61000000-0000-4000-8000-000000000001','cancelled.pdf',100,'discarded');
insert into storage.objects(bucket_id,name,metadata) values ('resume-originals','61000000-0000-4000-8000-000000000001/61000000-0000-4000-8000-000000000031','{"size":100}');
set local role authenticated;
select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
do $$
declare app_id uuid := (select id from public.applications where job_posting_id = '61000000-0000-4000-8000-000000000011');
begin
  begin
    perform public.confirm_submitted_resume('61000000-0000-4000-8000-000000000041',app_id,current_date,'text','61000000-0000-4000-8000-000000000021',1,null,'',false);
    raise exception 'No approval accepted';
  exception when invalid_parameter_value then null; end;
  perform public.confirm_submitted_resume('61000000-0000-4000-8000-000000000041',app_id,current_date,'text','61000000-0000-4000-8000-000000000021',1,null,'',true);
  perform public.confirm_submitted_resume('61000000-0000-4000-8000-000000000041',app_id,current_date,'text','61000000-0000-4000-8000-000000000021',1,null,'',true);
  if (select count(*) from public.submitted_resumes) <> 1 then raise exception 'Duplicate retry'; end if;
  begin
    perform public.confirm_submitted_resume('61000000-0000-4000-8000-000000000041',app_id,current_date,'text','61000000-0000-4000-8000-000000000021',1,null,'different',true);
    raise exception 'Request ID reused with changed payload';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.confirm_submitted_resume('61000000-0000-4000-8000-000000000042',app_id,current_date,'file',null,null,'61000000-0000-4000-8000-000000000032','',true);
    raise exception 'Other owner file accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.confirm_submitted_resume('61000000-0000-4000-8000-000000000042',app_id,current_date,'file',null,null,'61000000-0000-4000-8000-000000000033','',true);
    raise exception 'Discarded file accepted';
  exception when insufficient_privilege then null; end;
  perform public.confirm_submitted_resume('61000000-0000-4000-8000-000000000042',app_id,current_date,'file',null,null,'61000000-0000-4000-8000-000000000031','실제 파일',true);
  begin
    perform public.discard_resume_upload('61000000-0000-4000-8000-000000000031');
    raise exception 'Submitted original discarded';
  exception when insufficient_privilege then null; end;
  delete from storage.objects where name = '61000000-0000-4000-8000-000000000001/61000000-0000-4000-8000-000000000031';
  if not exists(select 1 from storage.objects where name = '61000000-0000-4000-8000-000000000001/61000000-0000-4000-8000-000000000031') then raise exception 'Submitted original deleted'; end if;
  begin
    update public.submitted_resumes set content = 'changed';
    raise exception 'Snapshot changed';
  exception when insufficient_privilege then null; end;
  perform public.save_resume('61000000-0000-4000-8000-000000000021',1,'새 제목','나중에 수정한 본문');
  if (select content from public.submitted_resumes where source_kind = 'text') <> '제출한 본문 원문' then raise exception 'Snapshot followed current resume'; end if;
  if (select pipeline_stage from public.applications where id = app_id) <> '검토중' then raise exception 'Submission changed stage'; end if;
end $$;
select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.submitted_resumes) then raise exception 'Cross-user read'; end if;
  begin
    perform public.confirm_submitted_resume('61000000-0000-4000-8000-000000000043',gen_random_uuid(),current_date,'file',null,null,'61000000-0000-4000-8000-000000000031','',true);
    raise exception 'Cross-user confirmation';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
