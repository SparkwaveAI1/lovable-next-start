-- Allow the authenticated Sales Queue UI to record completed follow-up actions.
-- The UI intentionally records an internal activity only; it does not send outreach.

alter table public.sales_activities
  drop constraint if exists sales_activities_activity_type_check;

alter table public.sales_activities
  add constraint sales_activities_activity_type_check
  check (
    activity_type = any (array[
      'prospect_researched'::text,
      'outreach_drafted'::text,
      'email_sent'::text,
      'response_received'::text,
      'meeting_booked'::text,
      'sms_sent'::text,
      'call_made'::text,
      'follow_up_sent'::text
    ])
  );
