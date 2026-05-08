-- Growth OS CRM repair: non-destructive canonical CRM fields for contacts and sales_prospects.
-- Safe to run more than once: columns/indexes are added only when missing and checks are guarded.

alter table public.contacts
  add column if not exists source_campaign text,
  add column if not exists source_type text,
  add column if not exists consent_status text default 'unknown',
  add column if not exists consent_notes text,
  add column if not exists owner_user text,
  add column if not exists owner_agent text,
  add column if not exists next_action text,
  add column if not exists next_action_due_at timestamptz,
  add column if not exists qualification_data jsonb default '{}'::jsonb,
  add column if not exists ai_summary text,
  add column if not exists lead_score integer,
  add column if not exists priority text default 'normal',
  add column if not exists outcome text,
  add column if not exists lost_reason text;

alter table public.sales_prospects
  add column if not exists source_type text default 'scraped_cold',
  add column if not exists consent_status text default 'not_opted_in',
  add column if not exists owner_agent text,
  add column if not exists priority text default 'normal',
  add column if not exists next_action text,
  add column if not exists next_action_due_at timestamptz,
  add column if not exists qualification_data jsonb default '{}'::jsonb,
  add column if not exists ai_summary text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contacts_source_type_safe_vocab') then
    alter table public.contacts add constraint contacts_source_type_safe_vocab
      check (source_type is null or source_type in ('inbound','opted_in','scraped_cold','partner','referral','manual','unknown'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contacts_consent_status_safe_vocab') then
    alter table public.contacts add constraint contacts_consent_status_safe_vocab
      check (consent_status is null or consent_status in ('unknown','opted_in','not_opted_in','unsubscribed','do_not_contact','legitimate_interest'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contacts_priority_safe_vocab') then
    alter table public.contacts add constraint contacts_priority_safe_vocab
      check (priority is null or priority in ('low','normal','high','urgent'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contacts_outcome_safe_vocab') then
    alter table public.contacts add constraint contacts_outcome_safe_vocab
      check (outcome is null or outcome in ('open','won','lost','nurture','do_not_contact'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_prospects_source_type_safe_vocab') then
    alter table public.sales_prospects add constraint sales_prospects_source_type_safe_vocab
      check (source_type is null or source_type in ('inbound','opted_in','scraped_cold','partner','referral','manual','unknown'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_prospects_consent_status_safe_vocab') then
    alter table public.sales_prospects add constraint sales_prospects_consent_status_safe_vocab
      check (consent_status is null or consent_status in ('unknown','opted_in','not_opted_in','unsubscribed','do_not_contact','legitimate_interest'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_prospects_priority_safe_vocab') then
    alter table public.sales_prospects add constraint sales_prospects_priority_safe_vocab
      check (priority is null or priority in ('low','normal','high','urgent'));
  end if;
end $$;

create index if not exists idx_contacts_source_type on public.contacts (source_type);
create index if not exists idx_contacts_consent_status on public.contacts (consent_status);
create index if not exists idx_contacts_priority on public.contacts (priority);
create index if not exists idx_contacts_next_action_due_at on public.contacts (next_action_due_at) where next_action_due_at is not null;
create index if not exists idx_contacts_owner_agent on public.contacts (owner_agent) where owner_agent is not null;

create index if not exists idx_sales_prospects_source_type on public.sales_prospects (source_type);
create index if not exists idx_sales_prospects_consent_status on public.sales_prospects (consent_status);
create index if not exists idx_sales_prospects_priority on public.sales_prospects (priority);
create index if not exists idx_sales_prospects_next_action_due_at on public.sales_prospects (next_action_due_at) where next_action_due_at is not null;
create index if not exists idx_sales_prospects_owner_agent on public.sales_prospects (owner_agent) where owner_agent is not null;

comment on column public.contacts.source_campaign is 'Growth OS CRM: acquisition campaign/source campaign label.';
comment on column public.contacts.source_type is 'Growth OS CRM source category; constrained to safe vocabulary.';
comment on column public.contacts.consent_status is 'Growth OS CRM consent/contactability status.';
comment on column public.contacts.owner_user is 'Growth OS CRM human owner identifier.';
comment on column public.contacts.owner_agent is 'Growth OS CRM AI/agent owner identifier.';
comment on column public.contacts.next_action is 'Growth OS CRM next recommended action.';
comment on column public.contacts.next_action_due_at is 'Growth OS CRM due timestamp for next action.';
comment on column public.contacts.qualification_data is 'Growth OS CRM structured qualification data.';
comment on column public.contacts.ai_summary is 'Growth OS CRM AI-generated contact summary.';
comment on column public.contacts.lead_score is 'Growth OS CRM lead score.';
comment on column public.contacts.priority is 'Growth OS CRM priority.';
comment on column public.contacts.outcome is 'Growth OS CRM terminal/current outcome.';
comment on column public.contacts.lost_reason is 'Growth OS CRM lost/disqualification reason.';

comment on column public.sales_prospects.source_type is 'Growth OS CRM source category; constrained to safe vocabulary.';
comment on column public.sales_prospects.consent_status is 'Growth OS CRM consent/contactability status.';
comment on column public.sales_prospects.owner_agent is 'Growth OS CRM AI/agent owner identifier.';
comment on column public.sales_prospects.priority is 'Growth OS CRM priority.';
comment on column public.sales_prospects.next_action is 'Growth OS CRM next recommended action.';
comment on column public.sales_prospects.next_action_due_at is 'Growth OS CRM due timestamp for next action.';
comment on column public.sales_prospects.qualification_data is 'Growth OS CRM structured qualification data.';
comment on column public.sales_prospects.ai_summary is 'Growth OS CRM AI-generated prospect summary.';
