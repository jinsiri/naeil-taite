begin;
select plan(6);
select has_table('public', 'scoring_preferences', 'scoring settings table exists');
select col_is_pk('public', 'scoring_preferences', 'user_id', 'settings are keyed by owner');
select policies_are('public', 'scoring_preferences', array[
  'scoring_preferences_read_own', 'scoring_preferences_insert_own', 'scoring_preferences_update_own'
], 'owner policies are installed');
select has_column('public', 'job_postings', 'work_location', 'job postings keep structured workplace location');
select has_policy('public', 'job_postings', 'job_postings_update_work_location_own', 'workplace location is owner editable');
select is(
  (select trim(both chr(39) from replace(column_default, '::jsonb', ''))::jsonb
   from information_schema.columns
   where table_schema = 'public' and table_name = 'scoring_preferences' and column_name = 'weights'),
  '{"careerCapital":23,"roleFit":23,"companyQuality":18,"targetAlignment":18,"personalFit":9,"publicTransitFit":9}'::jsonb,
  'new preferences allocate 100 percent'
);
select * from finish();
rollback;
