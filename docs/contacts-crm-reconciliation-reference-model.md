# Contacts/CRM Reconciliation Reference Model

Issue: SPA-5012
Owner: Walter
Status: reference design only - no DB migrations, no deploy, no destructive contact changes
Last updated: 2026-05-11

## Purpose

This document defines the reference model for reconciling contact and CRM data across the Sparkwave app's landing pages, forms, inbound SMS/contact paths, CRM views, campaign targeting, and follow-up automation.

The goal is one canonical contact record per business/person identity, with all acquisition paths resolving through the same identifiers, dedupe rules, lifecycle fields, and handoff metadata before any future implementation work begins.

## Current observed schema and paths

Observed in repository only:

- `contacts` base table: `id`, `business_id`, `first_name`, `last_name`, `email`, `phone`, `source`, `status`, `status_notes`, timestamps.
- CRM/pipeline fields: `lead_type`, `pipeline_stage`, `last_activity_date`, `interested_programs`, `next_follow_up_date`.
- Marketing/channel fields: `email_status`, `sms_status`, `tags`, `metadata`, `lifetime_value`, `preferred_channel`.
- Existing dedupe migration: unique partial indexes for `(business_id, lower(email))` and `(business_id, phone)` plus `find_or_create_contact(...)` RPC.
- Inbound SMS path has local `findOrCreateContact(...)` logic that normalizes phone and creates `source = 'sms_inbound'` contacts.
- Follow-up automation uses `contact_follow_ups`, `sequence_message_queue`, and `contact_message_log` against `contact_id`.

Reference files inspected:

- `supabase/migrations/20250901192544_adf263c2-7a38-4c9b-a5b9-9b3c23b8a5f2.sql`
- `supabase/migrations/20251003133110_3209210c-02df-4217-aeef-7f8a534d412d.sql`
- `supabase/migrations/20251220032521_90e8914b-bbd2-4a72-8c82-255127e72913.sql`
- `supabase/migrations/20260112180000_add_contact_unique_constraints.sql`
- `supabase/functions/sms-webhook/index.ts`

## Core entities

### 1. Contact

Canonical CRM person record scoped to one `business_id`.

Required canonical fields:

- `id`: stable UUID used by downstream tables.
- `business_id`: tenant boundary and first dedupe scope.
- `first_name`, `last_name`: best-known display identity; never used alone for dedupe.
- `email`: normalized lower-case email when available.
- `phone`: normalized E.164-style phone when available.
- `source`: first known acquisition source.
- `status`: coarse lifecycle status.
- `lead_type`: product/process type for routing.
- `pipeline_stage`: sales/service stage for CRM board views.
- `preferred_channel`: best channel for outreach.
- `email_status`, `sms_status`: consent/deliverability gates.
- `tags`: segmentation and special handling flags.
- `metadata`: flexible structured source details, raw payload fragments, and reconciliation audit hints.
- `last_activity_date`, `next_follow_up_date`: operational timers.

### 2. Contact identity

Logical identity values attached to a contact. Current schema stores email/phone directly on `contacts`; future implementation may split these into a child identity table, but the reference model treats identity as:

- Primary email identity: `(business_id, normalized_email)`.
- Primary phone identity: `(business_id, normalized_phone)`.
- Optional external identities: form submission id, provider conversation/thread id, booking id, imported CRM id, campaign recipient id.

### 3. Contact source event

A non-destructive event representing a landing/form/contact path touch.

Examples:

- Landing page form submitted.
- Contact-us form submitted.
- Inbound SMS received.
- Booking/trial detected.
- Manual CRM import.
- Campaign reply/click/open.

Source event fields should include:

- `contact_id`
- `business_id`
- `source_system`
- `source_path`
- `external_id`
- `occurred_at`
- `raw_payload` or payload pointer
- `dedupe_result`: `matched_existing`, `created_new`, `ambiguous`, `rejected`
- `matched_by`: `email`, `phone`, `external_id`, `manual`, `none`

### 4. Ownership/handoff record

Operational assignment metadata that says who or what should handle the contact next.

Fields to model, whether on `contacts`, task tables, or a dedicated handoff table:

- `owner_agent`: e.g. `rico`, `iris`, `jerry`, `dev`, `human`.
- `owner_user_id`: human account owner when known.
- `handoff_state`: `unassigned`, `agent_owned`, `human_review`, `human_owned`, `closed`.
- `handoff_reason`: `new_lead`, `booking_requested`, `reply_received`, `opt_out`, `data_conflict`, `manual_escalation`.
- `handoff_due_at`: SLA timer for next action.
- `last_handoff_at`.
- `handoff_notes`.

## Canonical identifiers and identity keys

Use identifiers in this order:

1. `contact.id` - canonical internal ID after resolution.
2. `(business_id, normalized_email)` - strongest current person match when email exists.
3. `(business_id, normalized_phone)` - strongest current person match when email is absent or path is SMS-first.
4. `(business_id, external_source, external_id)` - deterministic source event identity, especially for provider/webhook replays.
5. `(business_id, normalized_name + weak context)` - weak candidate only; must not auto-merge without review.

Normalization rules:

- Email: trim, lower-case, reject blank strings as null.
- Phone: normalize to E.164 where possible; for US 10-digit numbers, prefix `+1`; for 11-digit US numbers starting with `1`, prefix `+`; preserve raw phone in metadata/source event for audit.
- Names: trim whitespace, preserve capitalization, do not dedupe on name alone.
- Source strings: controlled slugs such as `landing_page`, `contact_form`, `sms_inbound`, `manual_import`, `campaign_reply`, `booking_flow`.
- Tags: lower-case slugs, idempotent add/remove.

## Dedupe and reconciliation rules

### Insert/resolve flow

Every contact-writing path should call one canonical resolver. The reference order:

1. Validate tenant: require `business_id`.
2. Normalize email and phone.
3. If a source event external id exists, check idempotency first to avoid replay duplicates.
4. If normalized email exists, search exact `(business_id, normalized_email)`.
5. If no email match and normalized phone exists, search exact `(business_id, normalized_phone)`.
6. If both email and phone exist and they match different existing contacts, do not auto-merge. Create a conflict/review event and route to human review.
7. If one match exists, update non-destructive enrichment fields only.
8. If no match exists, create contact.
9. Record source event and dedupe result.
10. Touch `last_activity_date` and schedule/adjust handoff if applicable.

### Merge precedence

When merging is explicitly approved in future tooling:

- Oldest `created_at` contact survives by default.
- Preserve all unique source events, message logs, follow-ups, campaign events, bookings, and notes by re-pointing FKs to survivor.
- Preserve first-known `source` on survivor; put later sources in source events and/or metadata.
- Prefer non-null verified email/phone over unknown values.
- Never overwrite opt-out or suppression states with active/subscribed values.
- Append tags; do not drop tags.
- Keep `status_notes` and handoff notes as appended audit trail, not replacement.

### Conflict handling

Ambiguous cases requiring review:

- Submitted email matches contact A, submitted phone matches contact B.
- Same phone used by multiple people in same business context.
- Import row has no email/phone and only weak name/company matching.
- Existing contact is `do_not_contact`/opted out and new form attempts to re-subscribe without explicit consent evidence.
- Webhook payload replays with changed identity values for the same external id.

## Lifecycle states

### Contact `status`

Recommended controlled states:

- `new_lead`: first captured, not yet qualified.
- `contacted`: at least one outbound or inbound response acknowledged.
- `qualified`: fits service/offer and should be worked.
- `booked`: call/trial/appointment booked.
- `customer`: converted or active customer.
- `nurture`: not ready but marketable.
- `lost`: disqualified, not a fit, or closed lost.
- `do_not_contact`: hard suppression.

### `pipeline_stage`

Pipeline stage should be process-specific, but the baseline CRM funnel is:

- `new`
- `attempting_contact`
- `engaged`
- `appointment_requested`
- `appointment_booked`
- `showed`
- `converted`
- `lost`

### Channel consent/deliverability

Email status:

- `subscribed`
- `unsubscribed`
- `bounced`
- `complained`
- `unknown`

SMS status:

- `active`
- `opted_out`
- `invalid`
- `unknown`

Suppression rule: if `status = do_not_contact`, `sms_status = opted_out`, `email_status in (unsubscribed, complained)`, or tags include `do_not_contact`, automation must not send on that channel.

## Ownership and handoff rules

Default handoff rules:

- New landing/contact form with email/phone: `owner_agent = rico` or current lead triage agent, `handoff_state = agent_owned`, `handoff_reason = new_lead`.
- Inbound SMS from new or existing contact: pause active automated follow-ups, touch activity, route to `owner_agent = iris` or SMS responder, reason `reply_received`.
- Booking intent detected: `handoff_state = human_review`, reason `booking_requested`, due immediately.
- Opt-out detected: `handoff_state = closed`, reason `opt_out`, cancel follow-ups, block outreach.
- Data conflict: `handoff_state = human_review`, reason `data_conflict`, no merge until reviewed.

Ownership fields should be explicit enough that CRM UI, automations, and Paperclip/Rico operations can agree on who handles the contact next.

## Minimum viable schema/API changes before implementation

No migrations were created for this issue. These are proposals for later implementation tickets.

Minimum viable schema changes:

1. Add one canonical resolver entry point, preferably `resolve_contact(...)` as an RPC or server-side service used by every form/webhook/import path.
2. Add `contact_source_events` for idempotency and audit:
   - `id uuid primary key`
   - `business_id uuid not null`
   - `contact_id uuid references contacts(id)`
   - `source_system text not null`
   - `source_path text`
   - `external_id text`
   - `occurred_at timestamptz not null default now()`
   - `raw_payload jsonb`
   - `dedupe_result text not null`
   - `matched_by text`
   - unique partial index on `(business_id, source_system, external_id)` where `external_id is not null`
3. Add `contact_reconciliation_conflicts` for records that must not auto-merge:
   - `id uuid primary key`
   - `business_id uuid not null`
   - `left_contact_id uuid references contacts(id)`
   - `right_contact_id uuid references contacts(id)`
   - `incoming_payload jsonb`
   - `reason text not null`
   - `status text not null default 'open'`
   - `created_at timestamptz not null default now()`
   - `resolved_at timestamptz`
4. Add explicit handoff/ownership fields either to `contacts`, an existing task model, or a new `contact_handoffs` table after confirming the app's owner model:
   - `owner_agent text`
   - `owner_user_id uuid`
   - `handoff_state text`
   - `handoff_reason text`
   - `handoff_due_at timestamptz`
   - `last_handoff_at timestamptz`
5. Add normalized generated columns or write-time canonical columns for email/phone if production values are mixed raw formats:
   - `normalized_email text`
   - `normalized_phone text`
   - unique partial indexes scoped by `business_id`.

Minimum viable API/service changes:

1. `POST /contacts/resolve` - normalize, dedupe, create/update, record source event, return contact plus dedupe result.
2. `POST /contacts/:id/source-events` - attach non-destructive source events for manual/import paths.
3. `POST /contacts/:id/handoff` - update assignment/handoff state without changing identity.
4. `POST /contacts/conflicts/:id/resolve` - explicit human-approved merge/split/no-op decision.
5. Replace local contact creation in SMS webhook, landing forms, contact forms, booking paths, and imports with the resolver.
6. Add tests for replay idempotency, email match, phone match, email-phone conflict, opt-out preservation, and FK preservation during approved merges.

## Migration/backfill risks

- Existing duplicate emails/phones may violate future unique indexes; cleanup must run before enforcing constraints.
- Phone values may be stored as raw local numbers, formatted display strings, or E.164; backfill normalization can accidentally merge distinct contacts if country assumptions are wrong.
- Email case and whitespace differences can create silent duplicates unless normalized consistently.
- Existing `contacts.source` may contain first-touch, latest-touch, or free-form values; source-event backfill must not overwrite first-known source blindly.
- Automations may currently query `status`, `pipeline_stage`, `email_status`, or `sms_status` with implicit string values; converting to controlled states can break filters if not mapped.
- Re-pointing FKs during approved merges touches follow-ups, sequence queues, message logs, campaign data, notes, and bookings; every dependent table must be listed and tested first.
- Consent and opt-out records are legally sensitive; backfill must preserve the most restrictive state.
- RLS policies may need updates for new source-event/conflict/handoff tables; otherwise UI/API reads may fail even if writes work.
- Webhook replay idempotency depends on stable external ids; source systems without external ids need deterministic payload hashes or duplicate windows.

## Verification queries/checks for future implementation

Run these in staging/read-only first; do not run against production until implementation is approved.

Duplicate candidates before adding unique constraints:

```sql
select business_id, lower(trim(email)) as normalized_email, count(*) as contact_count, array_agg(id) as contact_ids
from contacts
where nullif(trim(email), '') is not null
group by business_id, lower(trim(email))
having count(*) > 1
order by contact_count desc;
```

```sql
select business_id, regexp_replace(phone, '[^0-9+]', '', 'g') as normalized_phone, count(*) as contact_count, array_agg(id) as contact_ids
from contacts
where nullif(trim(phone), '') is not null
group by business_id, regexp_replace(phone, '[^0-9+]', '', 'g')
having count(*) > 1
order by contact_count desc;
```

Email-vs-phone collision candidates that must become conflicts, not auto-merges:

```sql
with incoming as (
  select business_id, lower(trim(email)) as normalized_email, regexp_replace(phone, '[^0-9+]', '', 'g') as normalized_phone, id
  from contacts
  where nullif(trim(email), '') is not null and nullif(trim(phone), '') is not null
)
select e.business_id, e.id as email_match_contact_id, p.id as phone_match_contact_id, e.normalized_email, e.normalized_phone
from incoming e
join contacts p
  on p.business_id = e.business_id
 and regexp_replace(p.phone, '[^0-9+]', '', 'g') = e.normalized_phone
 and p.id <> e.id
where exists (
  select 1 from contacts c
  where c.business_id = e.business_id
    and lower(trim(c.email)) = e.normalized_email
    and c.id = e.id
);
```

Suppression preservation check:

```sql
select id, business_id, status, email_status, sms_status, tags
from contacts
where status = 'do_not_contact'
   or email_status in ('unsubscribed', 'complained')
   or sms_status = 'opted_out'
   or tags::text ilike '%do_not_contact%';
```

Source-event idempotency check after implementation:

```sql
select business_id, source_system, external_id, count(*)
from contact_source_events
where external_id is not null
group by business_id, source_system, external_id
having count(*) > 1;
```

Resolver behavioral checks:

- Same `(business_id, email)` submitted twice returns the same `contact_id` and records two source events or one idempotent event depending on external id.
- Same `(business_id, phone)` submitted through SMS and form returns the same `contact_id` if no email conflict exists.
- Incoming email matching contact A and phone matching contact B creates an open conflict and does not mutate either identity.
- Existing opt-out/suppressed contact remains suppressed after new inbound source event unless explicit re-consent is captured.
- New source event updates `last_activity_date` but does not wipe first-touch `source`.
- Merge tooling preserves/re-points all FKs and appends audit notes.

## Unknowns blocking implementation

- Which repo/branch is the current production source of truth for the Sparkwave app: `sparkwave-automation`, `lovable-next-start`, or another deployment branch.
- Whether production database already has the January dedupe migration applied successfully, including duplicate cleanup and unique indexes.
- Whether `phone` values in production are consistently normalized or mixed raw/E.164 formats.
- Whether all contact-producing landing/form paths are in this repo or spread across external Lovable/Wix/embedded forms.
- Existing human owner model: whether ownership belongs in contacts, tasks, mission control tables, Paperclip issues, or a new handoff table.
- Exact CRM UI expectations for `status` versus `pipeline_stage`; both exist and can drift without a controlled mapping.
- Consent source of truth for email/SMS when a user submits a new form after prior opt-out/unsubscribe.
- Whether imported/prospect pipeline data should merge into `contacts` or stay in separate prospect tables with a linking identity.

## No-migration verification note

Verification performed by repository inspection and artifact creation only. I did not create or edit any `supabase/migrations/*` file, did not run migration commands, did not deploy, and did not perform any production contact mutations.
