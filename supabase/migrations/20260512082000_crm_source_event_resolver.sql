-- SPA-5581: Booking/form provenance resolver for canonical CRM contacts.
-- Additive only: records source events and links exact unambiguous matches without overwriting contacts.source.

alter table if exists public.sparkwave_booking_requests
  add column if not exists contact_id uuid references public.contacts(id),
  add column if not exists source_event_status text not null default 'pending_review'
    check (source_event_status in ('linked', 'queued', 'conflict', 'pending_review'));

create table if not exists public.crm_source_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  source_table text not null,
  source_record_id uuid,
  source_path text,
  source_url text,
  source_label text not null,
  event_type text not null default 'form_submit',
  email text,
  phone text,
  name text,
  payload jsonb not null default '{}'::jsonb,
  resolution_status text not null default 'queued'
    check (resolution_status in ('linked', 'queued', 'conflict')),
  resolution_reason text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint crm_source_events_source_unique unique (source_table, source_record_id)
);

create index if not exists idx_crm_source_events_contact_id on public.crm_source_events(contact_id);
create index if not exists idx_crm_source_events_business_email on public.crm_source_events(business_id, lower(email)) where email is not null;
create index if not exists idx_crm_source_events_status on public.crm_source_events(resolution_status, created_at desc);

create table if not exists public.crm_source_event_conflicts (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid not null references public.crm_source_events(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  conflict_type text not null check (conflict_type in ('multiple_contact_matches', 'missing_identity', 'missing_business_context')),
  candidate_contact_ids uuid[] not null default '{}',
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_crm_source_event_conflicts_status on public.crm_source_event_conflicts(status, created_at desc);

comment on table public.crm_source_events is 'Provenance/source-event queue for booking and form submits that need canonical CRM contact linkage. Does not overwrite contacts.source.';
comment on table public.crm_source_event_conflicts is 'Manual review queue for ambiguous CRM source-event contact matches.';

create or replace function public.resolve_crm_source_event(
  p_source_table text,
  p_source_record_id uuid,
  p_business_id uuid,
  p_email text,
  p_phone text,
  p_name text,
  p_source_label text,
  p_source_path text default null,
  p_source_url text default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), '');
  v_candidate_ids uuid[] := '{}';
  v_candidate_count integer := 0;
  v_contact_id uuid;
begin
  if p_business_id is null then
    insert into public.crm_source_events (
      business_id, source_table, source_record_id, source_path, source_url, source_label,
      email, phone, name, payload, resolution_status, resolution_reason
    ) values (
      p_business_id, p_source_table, p_source_record_id, p_source_path, p_source_url, p_source_label,
      v_email, v_phone, p_name, coalesce(p_payload, '{}'::jsonb), 'conflict', 'missing business context'
    )
    on conflict (source_table, source_record_id) do update set
      payload = excluded.payload,
      resolution_status = 'conflict',
      resolution_reason = excluded.resolution_reason
    returning id into v_event_id;

    insert into public.crm_source_event_conflicts (source_event_id, business_id, conflict_type, details)
    values (v_event_id, p_business_id, 'missing_business_context', jsonb_build_object('source_table', p_source_table, 'source_record_id', p_source_record_id))
    on conflict do nothing;
    return v_event_id;
  end if;

  if v_email is null and v_phone is null then
    insert into public.crm_source_events (
      business_id, source_table, source_record_id, source_path, source_url, source_label,
      email, phone, name, payload, resolution_status, resolution_reason
    ) values (
      p_business_id, p_source_table, p_source_record_id, p_source_path, p_source_url, p_source_label,
      v_email, v_phone, p_name, coalesce(p_payload, '{}'::jsonb), 'conflict', 'missing email and phone'
    )
    on conflict (source_table, source_record_id) do update set
      payload = excluded.payload,
      resolution_status = 'conflict',
      resolution_reason = excluded.resolution_reason
    returning id into v_event_id;

    insert into public.crm_source_event_conflicts (source_event_id, business_id, conflict_type, details)
    values (v_event_id, p_business_id, 'missing_identity', jsonb_build_object('source_table', p_source_table, 'source_record_id', p_source_record_id))
    on conflict do nothing;
    return v_event_id;
  end if;

  select coalesce(array_agg(id order by created_at asc), '{}')
  into v_candidate_ids
  from public.contacts
  where business_id = p_business_id
    and (
      (v_email is not null and lower(email) = v_email)
      or (v_phone is not null and regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g') = v_phone)
    );

  v_candidate_count := coalesce(array_length(v_candidate_ids, 1), 0);

  if v_candidate_count = 1 then
    v_contact_id := v_candidate_ids[1];
    insert into public.crm_source_events (
      business_id, contact_id, source_table, source_record_id, source_path, source_url,
      source_label, email, phone, name, payload, resolution_status, resolution_reason, resolved_at
    ) values (
      p_business_id, v_contact_id, p_source_table, p_source_record_id, p_source_path, p_source_url,
      p_source_label, v_email, v_phone, p_name, coalesce(p_payload, '{}'::jsonb), 'linked', 'single exact email/phone match', now()
    )
    on conflict (source_table, source_record_id) do update set
      contact_id = excluded.contact_id,
      payload = excluded.payload,
      resolution_status = 'linked',
      resolution_reason = excluded.resolution_reason,
      resolved_at = now()
    returning id into v_event_id;
    return v_event_id;
  elsif v_candidate_count > 1 then
    insert into public.crm_source_events (
      business_id, source_table, source_record_id, source_path, source_url, source_label,
      email, phone, name, payload, resolution_status, resolution_reason
    ) values (
      p_business_id, p_source_table, p_source_record_id, p_source_path, p_source_url, p_source_label,
      v_email, v_phone, p_name, coalesce(p_payload, '{}'::jsonb), 'conflict', 'multiple exact contact matches'
    )
    on conflict (source_table, source_record_id) do update set
      payload = excluded.payload,
      resolution_status = 'conflict',
      resolution_reason = excluded.resolution_reason
    returning id into v_event_id;

    insert into public.crm_source_event_conflicts (source_event_id, business_id, conflict_type, candidate_contact_ids, details)
    values (
      v_event_id,
      p_business_id,
      'multiple_contact_matches',
      v_candidate_ids,
      jsonb_build_object('email', v_email, 'phone', v_phone, 'source_table', p_source_table, 'source_record_id', p_source_record_id)
    );
    return v_event_id;
  end if;

  insert into public.crm_source_events (
    business_id, source_table, source_record_id, source_path, source_url, source_label,
    email, phone, name, payload, resolution_status, resolution_reason
  ) values (
    p_business_id, p_source_table, p_source_record_id, p_source_path, p_source_url, p_source_label,
    v_email, v_phone, p_name, coalesce(p_payload, '{}'::jsonb), 'queued', 'no existing canonical contact match'
  )
  on conflict (source_table, source_record_id) do update set
    payload = excluded.payload,
    resolution_status = 'queued',
    resolution_reason = excluded.resolution_reason
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.resolve_sparkwave_booking_source_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_event_id uuid;
  v_status text;
  v_contact_id uuid;
begin
  select id into v_business_id
  from public.businesses
  where lower(coalesce(slug, '')) in ('sparkwave', 'sparkwave-ai', 'sparkwaveai')
     or lower(coalesce(name, '')) in ('sparkwave', 'sparkwave ai', 'sparkwave digital')
  order by created_at asc nulls last
  limit 1;

  v_event_id := public.resolve_crm_source_event(
    TG_TABLE_NAME,
    NEW.id,
    v_business_id,
    NEW.email,
    NEW.phone,
    NEW.name,
    case when NEW.topic ilike '%seo%' then 'booking:seo' else 'booking:discovery' end,
    case
      when NEW.topic ilike '%seo%' or NEW.message like '%"source_path":"/book/seo"%' then '/book/seo'
      else '/book'
    end,
    null,
    to_jsonb(NEW)
  );

  select resolution_status, contact_id into v_status, v_contact_id
  from public.crm_source_events
  where id = v_event_id;

  NEW.contact_id := v_contact_id;
  NEW.source_event_status := case
    when v_status = 'linked' then 'linked'
    when v_status = 'conflict' then 'conflict'
    else 'queued'
  end;

  return NEW;
end;
$$;

do $$
begin
  if to_regclass('public.sparkwave_booking_requests') is not null then
    drop trigger if exists trg_resolve_sparkwave_booking_source_event on public.sparkwave_booking_requests;
    create trigger trg_resolve_sparkwave_booking_source_event
      before insert on public.sparkwave_booking_requests
      for each row execute function public.resolve_sparkwave_booking_source_event();
  end if;
end $$;
