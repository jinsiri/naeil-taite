alter table public.scoring_preferences
  rename column home_district to home_location;
alter table public.scoring_preferences
  drop constraint scoring_preferences_home_district_check;
alter table public.scoring_preferences
  add constraint scoring_preferences_home_location_check
  check (char_length(home_location) <= 160);
