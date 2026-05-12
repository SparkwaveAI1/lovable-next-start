-- Allow the SW app Review Queue to mark booking-form submissions as actively under review.
-- Existing allowed states: pending, confirmed, completed, cancelled.
-- New intermediate state: reviewing.

ALTER TABLE public.sparkwave_booking_requests
  DROP CONSTRAINT IF EXISTS sparkwave_booking_requests_status_check;

ALTER TABLE public.sparkwave_booking_requests
  ADD CONSTRAINT sparkwave_booking_requests_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'reviewing'::text,
    'confirmed'::text,
    'completed'::text,
    'cancelled'::text
  ]));
