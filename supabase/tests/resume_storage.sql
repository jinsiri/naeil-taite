-- Disposable Supabase DB only. SQL tests simulate Storage metadata, not object bytes.
begin;
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into public.resume_files(id, user_id, name, size) values
 ('20000000-0000-4000-8000-000000000001', auth.uid(), 'resume.pdf', 6291456),
 ('20000000-0000-4000-8000-000000000002', auth.uid(), 'cancel.txt', 10),
 ('20000000-0000-4000-8000-000000000003', auth.uid(), 'missing.pdf', 100);
-- Storage also has an owner_id column; save_resume must use its authenticated
-- owner variable for the object path, without an ambiguous column reference.
insert into storage.objects(bucket_id, name, metadata, owner_id) values
 ('resume-originals', auth.uid()::text || '/20000000-0000-4000-8000-000000000001', '{"size":6291456}', auth.uid()::text),
 ('resume-originals', auth.uid()::text || '/20000000-0000-4000-8000-000000000002', '{"size":10}', auth.uid()::text);
select set_config('test.resume_id', public.save_resume(null, 0, '이력서', '본문',
 p_file_id => '20000000-0000-4000-8000-000000000001', p_file_name => 'spoof.txt', p_file_size => 1)::text, true);
do $$
begin
 if (select file_size from public.resume_versions limit 1) <> 6291456 then raise exception 'Client metadata trusted'; end if;
 if (select file_name from public.resume_versions limit 1) <> 'resume.pdf' then raise exception 'Client name trusted'; end if;
 begin
  perform public.discard_resume_upload('20000000-0000-4000-8000-000000000001');
  raise exception 'Attached original discarded';
 exception when insufficient_privilege then null; end;
 delete from storage.objects where bucket_id = 'resume-originals';
 if (select count(*) from storage.objects where bucket_id = 'resume-originals') <> 2 then raise exception 'Undiscarded object deleted'; end if;
 update storage.objects set metadata = '{"size":1}' where bucket_id = 'resume-originals';
 if exists(select 1 from storage.objects where bucket_id = 'resume-originals' and metadata->>'size' = '1') then raise exception 'Original overwritten'; end if;
 begin
  perform public.save_resume(null, 0, 'missing', '본문', p_file_id => '20000000-0000-4000-8000-000000000003');
  raise exception 'Unuploaded file attached';
 exception when invalid_parameter_value then null; end;
 begin
  insert into public.resume_files(user_id,name,size,state) values(auth.uid(),'x.pdf',10,'attached');
  raise exception 'State forged';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.resume_files(user_id,name,size) values(auth.uid(),'large.pdf',10485761);
  raise exception 'Oversized accepted';
 exception when check_violation then null; end;
end $$;
select public.discard_resume_upload('20000000-0000-4000-8000-000000000002');
do $$
begin
 begin
  perform public.save_resume(null, 0, 'discarded', '본문', p_file_id => '20000000-0000-4000-8000-000000000002');
  raise exception 'Discarded upload attached';
 exception when insufficient_privilege then null; end;
 begin
  perform public.finish_discard_resume_upload('20000000-0000-4000-8000-000000000002');
  raise exception 'Removal prematurely completed';
 exception when invalid_parameter_value then null; end;
end $$;
delete from storage.objects where name = auth.uid()::text || '/20000000-0000-4000-8000-000000000002';
select public.finish_discard_resume_upload('20000000-0000-4000-8000-000000000002');
-- Retry after an ambiguous response is safe.
select public.discard_resume_upload('20000000-0000-4000-8000-000000000002');
select public.finish_discard_resume_upload('20000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
begin
 if exists(select 1 from public.resume_files) then raise exception 'Cross-user metadata read'; end if;
 if exists(select 1 from storage.objects where bucket_id = 'resume-originals') then raise exception 'Cross-user download'; end if;
 begin
  insert into storage.objects(bucket_id,name) values ('resume-originals','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001');
  raise exception 'Cross-user upload';
 exception when insufficient_privilege then null; end;
 begin
  perform public.save_resume(null,0,'attacker','본문',p_file_id=>'20000000-0000-4000-8000-000000000001');
  raise exception 'Cross-user file attached';
 exception when insufficient_privilege then null; end;
 begin
  perform public.discard_resume_upload('20000000-0000-4000-8000-000000000001');
  raise exception 'Cross-user discard';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$
begin
 if exists(select 1 from storage.objects where bucket_id = 'resume-originals') then raise exception 'Anonymous download'; end if;
 begin
  perform public.discard_resume_upload('20000000-0000-4000-8000-000000000001');
  raise exception 'Anonymous discard';
 exception when insufficient_privilege then null; end;
end $$;
rollback;

-- Legacy originals still support text edits and restores before the bytes are migrated.
begin;
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001');
insert into public.resumes(id,user_id) values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
insert into public.resume_files(id,user_id,name,size,state) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','old.pdf',128,'legacy');
insert into public.resume_versions(resume_id,user_id,version,title,content,file_id,file_name,file_size) values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'old','original',
 '20000000-0000-4000-8000-000000000001','old.pdf',128);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.save_resume('30000000-0000-4000-8000-000000000001',1,'edited','new content');
select public.save_resume('30000000-0000-4000-8000-000000000001',2,'','',p_restore_version=>1);
do $$
begin
 if (select count(*) from public.resume_versions where file_id = '20000000-0000-4000-8000-000000000001') <> 3 then
  raise exception 'Legacy file reference lost';
 end if;
 if (select state from public.resume_files limit 1) <> 'legacy' then raise exception 'Legacy file marked migrated without bytes'; end if;
end $$;
rollback;
