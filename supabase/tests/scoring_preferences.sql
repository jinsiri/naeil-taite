begin;
select plan(5);
select has_table('public', 'scoring_preferences', 'scoring settings table exists');
select col_is_pk('public', 'scoring_preferences', 'user_id', 'settings are keyed by owner');
select policies_are('public', 'scoring_preferences', array[
  'scoring_preferences_read_own', 'scoring_preferences_insert_own', 'scoring_preferences_update_own'
], 'owner policies are installed');
select has_column('public', 'job_postings', 'work_location', 'job postings keep structured workplace location');
select has_policy('public', 'job_postings', 'job_postings_update_work_location_own', 'workplace location is owner editable');
select * from finish();
rollback;
