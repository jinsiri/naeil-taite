begin;
insert into auth.users(id) values
  ('20000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002');
insert into public.job_postings(user_id, title, original_text) values
  ('20000000-0000-4000-8000-000000000001', '평가 테스트 공고', 'React와 TypeScript 경험을 가진 개발자를 찾습니다.');
insert into public.resumes(id, user_id, current_version) values
  ('20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000001', 1);
insert into public.resume_versions(resume_id, user_id, version, title, content) values
  ('20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000001', 1, '테스트 이력서', 'React와 TypeScript 프로젝트 경험');
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select public.save_job_review(
  (select id from public.job_postings where user_id = auth.uid()),
  '20000000-0000-4000-8000-000000000011', 1,
  '{"companyQuality":70,"roleFit":70,"careerCapital":70,"targetAlignment":70,"personalFit":70}'::jsonb,
  70, 63, 'DIRECT', '우선지원', 70, 'Medium', '검토중', '첫 평가 기록', null, null, null
);
select public.save_job_review(
  (select id from public.job_postings where user_id = auth.uid()),
  '20000000-0000-4000-8000-000000000011', 1,
  '{"companyQuality":70,"roleFit":70,"careerCapital":70,"targetAlignment":70,"personalFit":70}'::jsonb,
  70, 63, 'DIRECT', '우선지원', 70, 'Medium', '지원완료', '지원 완료 기록', null, null, null
);
select public.save_job_review(
  (select id from public.job_postings where user_id = auth.uid()),
  '20000000-0000-4000-8000-000000000011', 1,
  '{"companyQuality":70,"roleFit":70,"careerCapital":70,"targetAlignment":70,"personalFit":70}'::jsonb,
  70, 63, 'DIRECT', '우선지원', 70, 'Medium', '지원완료', 'AI 분석 기록', null, '{}'::jsonb, now()
);
do $$
begin
  if (select count(*) from public.job_reviews) <> 3 then raise exception 'Review snapshots were not appended'; end if;
  if (select pass_at_apply from public.job_reviews order by snapshot_number desc limit 1) <> 63 then raise exception 'Pass estimate was not frozen at apply'; end if;
  if not exists(select 1 from public.job_reviews where ai_analysis is not null and ai_consent_at is not null) then raise exception 'AI analysis consent timestamp was not stored'; end if;
  begin
    update public.job_reviews set pass_estimate = 99;
    raise exception 'Direct review update accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_job_review(
      (select id from public.job_postings where user_id = auth.uid()),
      '20000000-0000-4000-8000-000000000011', 1,
      '{"companyQuality":70,"roleFit":70,"careerCapital":70,"targetAlignment":70,"personalFit":70}'::jsonb,
      70, 63, 'DIRECT', '우선지원', 70, 'Medium', '지원완료', 'AI 분석', null, '{}'::jsonb, null
    );
    raise exception 'AI analysis saved without recorded consent';
  exception when invalid_parameter_value then null; end;
end $$;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists(select 1 from public.job_reviews) then raise exception 'Cross-user review read'; end if;
end $$;
rollback;
