# SPA-5029 Contacts/CRM Reconciliation Reference Model

Issue: SPA-5029
Owner: Walter
Status: reference design only - no DB migrations, no deploy, no destructive contact changes
Last updated: 2026-05-11

## Purpose

This document defines the implementation reference model for reconciling contacts and CRM data across Sparkwave app acquisition paths: landing pages, embedded/contact forms, Wix/webhook sync, inbound SMS, manual/import paths, CRM views, campaign targeting, and follow-up automation.

Target outcome: every contact-producing path resolves to one canonical contact per tenant/person identity, records the source touch non-destructively, protects opt-out/suppression data, and exposes clear ownership/handoff metadata for agents and humans.

## Repository observations used

Observed in `/root/repos/sparkwave-automation` only:

- `contacts` base table has tenant and identity fields: `id`, `business_id`, `first_name`, `last_name`, `email`, `phone`, `source`, `status`, `status_notes`, timestamps.
- CRM/pipeline fields exist on `contacts`: `lead_type`, `pipeline_stage`, `last_activity_date`, `interested_programs`, `next_follow_up_date`.
- Outreach/channel fields exist or are referenced: `email_status`, `sms_status`, `tags`, `metadata`, `lifetime_value`, `preferred_channel`, `sms_last_contacted`, `email_last_contacted`.
- Existing dedupe migration creates unique partial indexes for `(business_id, lower(email))` and `(business_id, phone)` and a `find_or_create_contact(...)` RPC.
- Inbound SMS currently has local `findOrCreateContact(...)` logic that normalizes phone, searches by phone, and creates `source = 'sms_inbound'`, `status = 'new_lead'`, `sms_status = 'active'` contacts.
- Follow-up and rate limiting paths depend on `contact_id` through `contact_follow_ups`, `sequence_message_queue`, and `contact_message_log`.
- Wix/webhook documentation says booking/contact/member sync deduplicates by email and phone.

Reference files inspected:

- `supabase/migrations/20251003133110_3209210c-02df-4217-aeef-7f8a534d412d.sql`
- `supabase/migrations/20251220034257_fcd421c1-9955-4ad6-98e6-4c8433461bda.sql`
- `supabase/migrations/20260112180000_add_contact_unique_constraints.sql`
- `supabase/migrations/20260113010000_add_multichannel_outreach.sql`
- `supabase/migrations/20260205151000_sms_rate_limiting.sql`
- `supabase/migrations/20260209013600_sequence_message_queue.sql`
- `supabase/functions/sms-webhook/index.ts`
- `docs/wix-webhook-setup.md`
- `docs/DEPLOY_FOLLOW_UPS.md`

## Core entities

### 1. Contact

Canonical CRM person record scoped by `business_id`.

Required canonical fields:

- `id`: stable internal UUID used by all downstream tables.
- `business_id`: tenant boundary and first dedupe scope.
- `first_name`, `last_name`: best-known display identity. Never dedupe on name alone.
- `email`: primary email, normalized lower-case at write/resolve time.
- `phone`: primary phone, normalized consistently before comparison.
- `source`: first known acquisition source, not latest touch.
- `status`: coarse lifecycle state.
- `lead_type`: routing category for sales/service process.
- `pipeline_stage`: CRM board/funnel position.
- `preferred_channel`: current best outreach channel.
- `email_status`, `sms_status`: channel-specific consent/deliverability gates.
- `tags`: segmentation and special-handling flags.
- `metadata`: structured enrichment, raw-source hints, and reconciliation audit details.
- `last_activity_date`, `next_follow_up_date`: operational timers.

### 2. Contact identity

Logical identity values attached to a contact. Current schema stores email/phone directly on `contacts`; future implementation may split identities into a child table, but the reconciliation model treats these as identities:

- Primary email identity: `(business_id, normalized_email)`.
- Primary phone identity: `(business_id, normalized_phone)`.
- Source identity: `(business_id, source_system, external_id)` for webhooks/import replays.
- Optional external identities: Wix contact/member/booking id, form submission id, provider conversation/thread id, campaign recipient id, imported CRM id.

### 3. Contact source event

Non-destructive event representing one acquisition/contact touch. This is the audit and idempotency layer; it should not overwrite the contact's first-touch `source`.

Examples:

- Landing page form submitted.
- Contact-us form submitted.
- Wix booking/contact/member event received.
- Inbound SMS received.
- Manual CRM import row processed.
- Campaign reply/click/open captured.

Source event fields:

- `id`
- `business_id`
- `contact_id`
- `source_system`: `landing`, `contact_form`, `wix`, `sms`, `manual_import`, `campaign`, etc.
- `source_path`: route/form/webhook name.
- `external_id`: provider event/contact/submission id when available.
- `occurred_at`
- `raw_payload` or pointer to raw payload.
- `dedupe_result`: `matched_existing`, `created_new`, `ambiguous`, `rejected`, `replayed`.
- `matched_by`: `email`, `phone`, `external_id`, `manual`, `none`.

### 4. Reconciliation conflict

Explicit record for data that must not auto-merge.

Conflict fields:

- `id`
- `business_id`
- `left_contact_id`
- `right_contact_id`
- `incoming_payload`
- `reason`: `email_phone_collision`, `weak_identity`, `suppression_conflict`, `external_identity_changed`, `multi_person_phone`, etc.
- `status`: `open`, `reviewing`, `resolved_merge`, `resolved_keep_separate`, `resolved_rejected`.
- `created_at`, `resolved_at`
- `resolved_by_user_id` or `resolved_by_agent`
- `resolution_notes`

### 5. Ownership/handoff

Operational assignment metadata that lets CRM UI, automations, and Paperclip/Rico-style operations agree on who handles the contact next.

Fields to model on `contacts`, an existing task model, or a future `contact_handoffs` table:

- `owner_agent`: e.g. `rico`, `iris`, `jerry`, `dev`, `human`.
- `owner_user_id`: human account owner when known.
- `handoff_state`: `unassigned`, `agent_owned`, `human_review`, `human_owned`, `closed`.
- `handoff_reason`: `new_lead`, `booking_requested`, `reply_received`, `opt_out`, `data_conflict`, `manual_escalation`.
- `handoff_due_at`: SLA timer for next action.
- `last_handoff_at`.
- `handoff_notes`.

## Canonical identifiers and identity keys

Resolver lookup order:

1. `contact.id` when the caller already has a trusted internal ID.
2. `(business_id, source_system, external_id)` for idempotent provider/webhook replay handling.
3. `(business_id, normalized_email)` for exact email match.
4. `(business_id, normalized_phone)` for exact phone match.
5. `(business_id, normalized_name + weak context)` only as a candidate for review; never auto-merge.

Normalization rules:

- Email: trim, lower-case, reject blank strings as null.
- Phone: normalize to a single canonical format before comparison. Recommended: E.164 when country can be inferred. For US 10-digit numbers, prefix `+1`; for 11-digit US numbers starting with `1`, prefix `+`; preserve raw phone in source event metadata.
- Names: trim whitespace, preserve user-friendly capitalization, do not dedupe on name alone.
- Source strings: controlled slugs such as `landing_page`, `contact_form`, `wix_booking`, `wix_contact`, `sms_inbound`, `manual_import`, `campaign_reply`, `booking_flow`.
- Tags: lower-case slugs, idempotent add/remove.

## Dedupe and reconciliation rules

### Resolve/insert flow

Every contact-writing path should call one canonical resolver. Reference behavior:

1. Require `business_id`.
2. Normalize email and phone.
3. If `source_system + external_id` exists, check source-event idempotency first.
4. If external id was already processed with the same payload identity, return the existing contact and mark `replayed`.
5. If normalized email exists, search exact `(business_id, normalized_email)`.
6. If normalized phone exists, search exact `(business_id, normalized_phone)`.
7. If email and phone point to different existing contacts, create a reconciliation conflict and do not mutate either identity.
8. If one match exists, update only safe enrichment/activity fields; never weaken consent/suppression state.
9. If no match exists, create a new contact.
10. Record a source event with dedupe result and matched-by reason.
11. Touch `last_activity_date` and create/update ownership handoff when applicable.

### Safe enrichment updates

Allowed on matched existing contact:

- Fill missing `first_name`/`last_name` when current value is blank, null, or placeholder.
- Fill missing email/phone only when it does not collide with another contact.
- Append tags; do not remove existing tags.
- Add structured metadata under source-specific keys.
- Update `last_activity_date`.
- Set `preferred_channel` from observed reply behavior if not already explicit.

Not allowed automatically:

- Overwrite non-null verified email/phone with a different value.
- Replace first-touch `source` with latest source.
- Convert `do_not_contact`, `opted_out`, `unsubscribed`, or `complained` to active/subscribed without explicit re-consent evidence.
- Merge two contacts when email and phone identify different records.
- Delete duplicate contacts outside an approved merge workflow.

### Merge precedence for future approved tooling

When a human-approved merge is implemented:

- Oldest `created_at` contact survives by default unless the reviewer picks another survivor.
- Preserve all source events, message logs, follow-ups, sequence queues, bookings, notes, activities, conversation threads, and campaign/email records by re-pointing FKs to the survivor.
- Preserve first-known `source` on survivor; later sources remain in source events/metadata.
- Prefer verified non-null email/phone over unknown values.
- Preserve the most restrictive consent/suppression state.
- Append tags and notes; do not drop them.
- Record merge decision in an audit trail.

### Conflict handling

Cases requiring review:

- Submitted email matches contact A while submitted phone matches contact B.
- Same phone number appears to belong to multiple people in the same business context.
- Import row has no email/phone and only weak name/company matching.
- Existing contact is suppressed/opted out and new source tries to re-subscribe without explicit consent evidence.
- Webhook replay arrives with a changed identity for the same external id.
- Wix/contact/form path sends a shared family/company phone with distinct email/person names.

## Lifecycle states

### Contact `status`

Recommended controlled states:

- `new_lead`: captured but not qualified.
- `contacted`: at least one outbound or inbound response acknowledged.
- `qualified`: fits offer and should be worked.
- `booked`: call/trial/appointment booked.
- `customer`: converted or active customer.
- `nurture`: not ready but marketable.
- `lost`: disqualified, not a fit, or closed lost.
- `do_not_contact`: hard suppression.

### `pipeline_stage`

Baseline CRM funnel:

- `new`
- `attempting_contact`
- `engaged`
- `appointment_requested`
- `appointment_booked`
- `showed`
- `converted`
- `lost`

`status` and `pipeline_stage` must have an explicit mapping. They should not drift independently in automations.

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

Suppression rule: automation must not send on a channel if `status = do_not_contact`, `sms_status = opted_out`, `email_status in (unsubscribed, complained)`, or tags include `do_not_contact`.

## Ownership and handoff rules

Default handoff rules:

- New landing/contact form with email or phone: `owner_agent = rico` or current lead-triage agent, `handoff_state = agent_owned`, `handoff_reason = new_lead`.
- Inbound SMS from new or existing contact: pause active automated follow-ups, touch activity, route to `owner_agent = iris` or SMS responder, `handoff_reason = reply_received`.
- Booking intent or Wix booking event: `handoff_state = human_review`, `handoff_reason = booking_requested`, due immediately.
- Opt-out detected: `handoff_state = closed`, `handoff_reason = opt_out`, cancel/pause follow-ups and block outreach.
- Data conflict: `handoff_state = human_review`, `handoff_reason = data_conflict`, no merge until reviewed.
- Manual import weak match: `handoff_state = human_review`, `handoff_reason = data_conflict` or `manual_escalation`.

## Proposed schema/data migrations only

No migrations were created for SPA-5029. These are proposals for future implementation tickets.

### Minimum viable schema proposals

1. Add a canonical resolver entry point, preferably `resolve_contact(...)` as an RPC or server-side service used by every form/webhook/import/SMS path.
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
   - `resolved_by_user_id uuid`
   - `resolved_by_agent text`
   - `resolution_notes text`
4. Add explicit handoff/ownership fields either to `contacts`, an existing task/mission-control model, or a dedicated `contact_handoffs` table after confirming the owner model:
   - `owner_agent text`
   - `owner_user_id uuid`
   - `handoff_state text`
   - `handoff_reason text`
   - `handoff_due_at timestamptz`
   - `last_handoff_at timestamptz`
   - `handoff_notes text`
5. Add normalized generated columns or write-time canonical fields if production values are mixed raw formats:
   - `normalized_email text`
   - `normalized_phone text`
   - unique partial indexes scoped by `business_id`.
6. Add RLS policies for any new source-event/conflict/handoff tables.

### Minimum viable API/service proposals

1. `POST /contacts/resolve` - normalize, dedupe, create/update, record source event, return contact plus dedupe result.
2. `POST /contacts/:id/source-events` - attach non-destructive source events for manual/import paths.
3. `POST /contacts/:id/handoff` - update assignment/handoff state without changing identity.
4. `GET /contacts/conflicts` - list open reconciliation conflicts for review.
5. `POST /contacts/conflicts/:id/resolve` - explicit human-approved merge/split/no-op decision.
6. Replace local contact creation in SMS webhook, landing forms, contact forms, Wix/booking paths, campaign replies, and imports with the resolver.
7. Add tests for replay idempotency, email match, phone match, email-phone conflict, opt-out preservation, source-event creation, safe enrichment, and FK preservation during approved merges.

## Migration/backfill risks for future work

- Existing duplicate emails/phones may violate future unique indexes; cleanup must run before enforcing constraints.
- Current phone dedupe uses trimmed raw `phone`; stronger E.164 normalization can merge records unexpectedly if country assumptions are wrong.
- Email case/whitespace differences create silent duplicates unless normalized consistently.
- Existing `contacts.source` may mix first-touch and latest-touch semantics; backfill must not overwrite first-known source blindly.
- Automations may query `status`, `pipeline_stage`, `email_status`, or `sms_status` with implicit values; controlled-state migration can break filters without mapping.
- Approved merge tooling must list and test every dependent FK table before repointing records.
- Consent/opt-out state is sensitive; backfill must preserve the most restrictive state.
- RLS policies can cause new source-event/conflict/handoff writes or reads to fail if not designed with tenant scoping.
- Source systems without stable external ids need deterministic payload hashes or duplicate windows for idempotency.

## Verification queries/checks for future implementation

Read-only/staging checks before any implementation:

Duplicate email candidates:

```sql
select business_id, lower(trim(email)) as normalized_email, count(*) as contact_count, array_agg(id) as contact_ids
from contacts
where nullif(trim(email), '') is not null
group by business_id, lower(trim(email))
having count(*) > 1
order by contact_count desc;
```

Duplicate phone candidates using stronger normalization than current trimmed-phone index:

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
with identity_values as (
  select id, business_id, lower(trim(email)) as normalized_email, regexp_replace(phone, '[^0-9+]', '', 'g') as normalized_phone
  from contacts
  where nullif(trim(email), '') is not null
     or nullif(trim(phone), '') is not null
)
select e.business_id,
       e.id as email_match_contact_id,
       p.id as phone_match_contact_id,
       e.normalized_email,
       p.normalized_phone
from identity_values e
join identity_values p
  on p.business_id = e.business_id
 and p.normalized_phone = e.normalized_phone
 and p.id <> e.id
where e.normalized_email is not null
  and p.normalized_phone is not null;
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

Source-event idempotency check after future implementation:

```sql
select business_id, source_system, external_id, count(*)
from contact_source_events
where external_id is not null
group by business_id, source_system, external_id
having count(*) > 1;
```

Resolver behavioral checks after future implementation:

- Same `(business_id, email)` submitted twice returns the same `contact_id`.
- Same `(business_id, phone)` submitted through SMS and form returns the same `contact_id` when no email conflict exists.
- Incoming email matching contact A and phone matching contact B creates an open conflict and does not mutate either identity.
- Existing opt-out/suppressed contact remains suppressed after a new inbound source event unless explicit re-consent is captured.
- New source event updates `last_activity_date` but does not wipe first-touch `source`.
- Merge tooling preserves/re-points all FKs and appends audit notes.

## Unknowns blocking implementation

- Which repository/branch is the current production source of truth for the Sparkwave app: `sparkwave-automation`, `lovable-next-start`, or another deployment branch.
- Whether production database has the January dedupe migration applied successfully, including duplicate cleanup and unique indexes.
- Whether production `phone` values are consistently normalized or mixed raw/E.164/display formats.
- Whether all contact-producing landing/form paths live in this repo or are spread across external Lovable/Wix/embedded forms.
- Which source systems provide stable external ids versus only raw payloads.
- Existing human owner model: contacts table, mission-control tasks, Paperclip issues, or a new handoff table.
- Exact CRM UI expectations for `status` versus `pipeline_stage`.
- Consent source of truth when a user submits a new form after prior opt-out/unsubscribe.
- Whether imported/prospect pipeline data should merge into `contacts` or remain in separate prospect tables with a linking identity.
- Required retention policy for raw payloads containing contact PII.

## No-migration verification note

Verification performed by repository inspection and artifact creation only. I did not create or edit any `supabase/migrations/*` file, did not run migration commands, did not deploy, and did not perform any production contact mutations.
