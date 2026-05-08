-- Allow authenticated app users to record legacy Sales Queue follow-up actions.
-- Existing service-role policies remain in place for server-side automation.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sales_activities'
      and policyname = 'authenticated_insert_sales_activities'
  ) then
    create policy authenticated_insert_sales_activities
      on public.sales_activities
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'prospects'
      and policyname = 'authenticated_update_prospects'
  ) then
    create policy authenticated_update_prospects
      on public.prospects
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
