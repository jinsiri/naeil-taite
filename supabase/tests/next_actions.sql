begin;
insert into auth.users(id) values ('62000000-0000-4000-8000-000000000001'),('62000000-0000-4000-8000-000000000002');
insert into public.job_postings(id,user_id,title,original_text) values
 ('62000000-0000-4000-8000-000000000011','62000000-0000-4000-8000-000000000001','행동 테스트','React와 TypeScript 경험을 가진 개발자를 찾습니다.'),
 ('62000000-0000-4000-8000-000000000012','62000000-0000-4000-8000-000000000001','다른 공고','React와 TypeScript 경험을 가진 개발자를 찾습니다.');
insert into public.application_reflections(id,user_id,job_posting_id,pipeline_stage,next_time_note) values
 ('62000000-0000-4000-8000-000000000021','62000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000011','검토중','경험 정리'),
 ('62000000-0000-4000-8000-000000000022','62000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000012','검토중','다른 공고 회고');
set local role authenticated;
select set_config('request.jwt.claim.sub','62000000-0000-4000-8000-000000000001',true);
do $$ declare app_id uuid := (select id from public.applications where job_posting_id = '62000000-0000-4000-8000-000000000011'); begin
  begin
    perform public.save_next_action('62000000-0000-4000-8000-000000000031',app_id,0,'경험 정리','',null,false,'62000000-0000-4000-8000-000000000022');
    raise exception 'Other job reflection accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_next_action('62000000-0000-4000-8000-000000000031',app_id,0,'  ','',null,false,null);
    raise exception 'Blank title accepted';
  exception when invalid_parameter_value then null; end;
  perform public.save_next_action('62000000-0000-4000-8000-000000000031',app_id,0,'경험 정리','원문 보존',current_date,false,'62000000-0000-4000-8000-000000000021');
  perform public.save_next_action('62000000-0000-4000-8000-000000000031',app_id,0,'경험 정리','원문 보존',current_date,false,'62000000-0000-4000-8000-000000000021');
  if (select count(*) from public.next_actions) <> 1 then raise exception 'Retry duplicated action'; end if;
  perform public.save_next_action('62000000-0000-4000-8000-000000000031',app_id,1,'경험 정리','원문 보존',current_date,true,'62000000-0000-4000-8000-000000000021');
  if (select completed_at from public.next_actions) is null then raise exception 'Completion missing'; end if;
  begin
    perform public.save_next_action('62000000-0000-4000-8000-000000000031',app_id,1,'stale','',null,false,'62000000-0000-4000-8000-000000000021');
    raise exception 'Stale write accepted';
  exception when serialization_failure then null; end;
  perform public.save_next_action('62000000-0000-4000-8000-000000000031',app_id,2,'새 행동','수정',null,false,'62000000-0000-4000-8000-000000000021');
  if (select completed_at from public.next_actions) is not null or (select revision from public.next_actions) <> 3 then raise exception 'Reopen failed'; end if;
  if (select next_time_note from public.application_reflections where id = '62000000-0000-4000-8000-000000000021') <> '경험 정리' then raise exception 'Reflection overwritten'; end if;
  begin
    update public.next_actions set title = 'direct';
    raise exception 'Direct write accepted';
  exception when insufficient_privilege then null; end;
end $$;
-- Pass the true application ID to test cross-user writes, not just an unknown UUID.
select set_config('test.application_id',(select id::text from public.applications where job_posting_id = '62000000-0000-4000-8000-000000000011'),true);
select set_config('request.jwt.claim.sub','62000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.next_actions) then raise exception 'Cross-user read'; end if;
  begin
    perform public.save_next_action('62000000-0000-4000-8000-000000000031',current_setting('test.application_id')::uuid,3,'intruder','',null,false,null);
    raise exception 'Cross-user update accepted';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
