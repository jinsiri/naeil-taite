begin;
insert into auth.users(id) values ('64000000-0000-4000-8000-000000000001'),('64000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','64000000-0000-4000-8000-000000000001',true);
select public.save_salary_record('64000000-0000-4000-8000-000000000011',0,'2024-01-01',2,'회사 A',4000,'첫 기록');
select public.save_salary_record('64000000-0000-4000-8000-000000000011',0,'2024-01-01',2,'회사 A',4000,'첫 기록');
select public.save_salary_record('64000000-0000-4000-8000-000000000012',0,'2024-10-01',2,'회사 B',4500,'업종 전환');
do $$ begin
  if (select count(*) from public.salary_records) <> 2 then raise exception 'Retry duplicated or same-year history lost'; end if;
  begin
    perform public.save_salary_record('64000000-0000-4000-8000-000000000013',0,'2025-01-01',0,'',4000,'');
    raise exception 'Invalid career accepted';
  exception when check_violation then null; end;
  begin
    perform public.save_salary_record('64000000-0000-4000-8000-000000000013',0,'2025-01-01',3,'',0,'');
    raise exception 'Zero salary accepted';
  exception when check_violation then null; end;
  begin
    perform public.delete_salary_record('64000000-0000-4000-8000-000000000011',1,false);
    raise exception 'Deletion without approval accepted';
  exception when invalid_parameter_value then null; end;
  perform public.save_salary_record('64000000-0000-4000-8000-000000000011',1,'2024-01-01',2,'회사 A',4100,'오입력 정정');
  begin
    perform public.save_salary_record('64000000-0000-4000-8000-000000000011',1,'2024-01-01',2,'회사 A',4200,'stale');
    raise exception 'Stale write accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.delete_salary_record('64000000-0000-4000-8000-000000000011',1,true);
    raise exception 'Stale deletion accepted';
  exception when serialization_failure then null; end;
  begin
    update public.salary_records set amount=1;
    raise exception 'Direct write accepted';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.salary_records;
    raise exception 'Direct deletion accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','64000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.salary_records) then raise exception 'Cross-user read'; end if;
  begin
    perform public.save_salary_record('64000000-0000-4000-8000-000000000011',2,'2024-01-01',2,'',1,'');
    raise exception 'Cross-user update';
  exception when insufficient_privilege then null; end;
  begin
    perform public.delete_salary_record('64000000-0000-4000-8000-000000000011',2,true);
    raise exception 'Cross-user delete';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform count(*) from public.salary_records;
    raise exception 'Anonymous read';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_salary_record('64000000-0000-4000-8000-000000000013',0,'2025-01-01',3,'',5000,'');
    raise exception 'Anonymous write';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','64000000-0000-4000-8000-000000000001',true);
select public.delete_salary_record('64000000-0000-4000-8000-000000000011',2,true);
do $$ begin
  if (select count(*) from public.salary_records) <> 1 then raise exception 'Wrong delete scope'; end if;
end $$;
rollback;
