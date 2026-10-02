-- Existing preferences and review snapshots retain their original weights.
-- Owner-based RLS policies on scoring_preferences remain in effect.
alter table public.scoring_preferences
  alter column weights set default '{"careerCapital":23,"roleFit":23,"companyQuality":18,"targetAlignment":18,"personalFit":9,"publicTransitFit":9}'::jsonb;
