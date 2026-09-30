create policy job_postings_delete_own on public.job_postings
  for delete to authenticated using ((select auth.uid()) = user_id);

grant delete on public.job_postings to authenticated;
