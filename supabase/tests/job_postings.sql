begin;
insert into auth.users(id)
values ('10000000-0000-4000-8000-000000000001'),
       ('10000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into public.job_postings(user_id, title, company, original_text)
values ('10000000-0000-4000-8000-000000000001', '프론트엔드 개발자', '예시 회사', 'React 경험과 TypeScript 활용 경험이 있는 분');
do $$
begin
  if (select count(*) from public.job_postings) <> 1 then raise exception 'Owner cannot read posting'; end if;
  begin
    insert into public.job_postings(user_id, title, original_text)
    values ('10000000-0000-4000-8000-000000000002', '타인 공고', '다른 사용자 소유 공고 원문');
    raise exception 'Cross-user insert accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.job_postings set title = '원문 변경 시도';
    raise exception 'Posting snapshot update accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists(select 1 from public.job_postings) then raise exception 'Cross-user read'; end if;
end $$;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.job_postings;
    raise exception 'Anonymous table read accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.job_postings(user_id, title, original_text)
    values ('10000000-0000-4000-8000-000000000001', '익명 공고', '익명으로 저장을 시도하는 공고 원문');
    raise exception 'Anonymous insert accepted';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
