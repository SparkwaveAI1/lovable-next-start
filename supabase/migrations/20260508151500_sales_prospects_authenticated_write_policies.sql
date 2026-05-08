-- Allow authenticated app users to create and update CRM prospects from the UI.
-- Existing service-role policy remains in place for server-side automation.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sales_prospects'
      and policyname = 'authenticated_insert_sales_prospects'
  ) then
    create policy authenticated_insert_sales_prospects
      on public.sales_prospects
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sales_prospects'
      and policyname = 'authenticated_update_sales_prospects'
  ) then
    create policy authenticated_update_sales_prospects
      on public.sales_prospects
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
