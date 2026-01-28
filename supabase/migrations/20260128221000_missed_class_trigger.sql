-- Trigger to enroll contacts in missed_class follow-up when they miss a booking
-- This handles Fight Flow's specific use case

-- Function to enroll contact in missed_class sequence
CREATE OR REPLACE FUNCTION enroll_missed_class_follow_up()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
  v_sequence_id UUID;
  v_first_step_delay INT;
  v_next_step_due TIMESTAMPTZ;
BEGIN
  -- Only trigger on status change to 'no_show' or 'missed'
  IF NEW.status NOT IN ('no_show', 'missed') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get business_id from the class_schedule
  SELECT cs.business_id INTO v_business_id
  FROM class_schedule cs
  WHERE cs.id = NEW.class_schedule_id;

  IF v_business_id IS NULL THEN
    -- Can't determine business, skip
    RETURN NEW;
  END IF;

  -- Find active missed_class sequence for this business
  SELECT id INTO v_sequence_id
  FROM follow_up_sequences
  WHERE business_id = v_business_id
    AND trigger_type = 'missed_class'
    AND is_active = true
  LIMIT 1;

  IF v_sequence_id IS NULL THEN
    -- No sequence configured, skip
    RETURN NEW;
  END IF;

  -- Get first step delay
  SELECT delay_hours INTO v_first_step_delay
  FROM follow_up_steps
  WHERE sequence_id = v_sequence_id
    AND step_order = 1;

  v_first_step_delay := COALESCE(v_first_step_delay, 4); -- Default 4 hours
  v_next_step_due := NOW() + (v_first_step_delay || ' hours')::INTERVAL;

  -- Insert enrollment (or update if re-enrolling)
  INSERT INTO contact_follow_ups (
    contact_id,
    sequence_id,
    business_id,
    status,
    current_step,
    next_step_due_at
  )
  VALUES (
    NEW.contact_id,
    v_sequence_id,
    v_business_id,
    'active',
    0,
    v_next_step_due
  )
  ON CONFLICT (contact_id, sequence_id) 
  DO UPDATE SET
    status = 'active',
    current_step = 0,
    enrolled_at = NOW(),
    next_step_due_at = v_next_step_due,
    last_step_sent_at = NULL,
    completed_at = NULL,
    pause_reason = NULL,
    updated_at = NOW()
  WHERE contact_follow_ups.status != 'active'; -- Don't re-enroll if already active

  RAISE NOTICE 'Enrolled contact % in missed_class sequence for business %', NEW.contact_id, v_business_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on class_bookings
DROP TRIGGER IF EXISTS trigger_missed_class_follow_up ON class_bookings;
CREATE TRIGGER trigger_missed_class_follow_up
  AFTER UPDATE ON class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION enroll_missed_class_follow_up();

-- Also handle case where booking is created directly as no_show (edge case)
DROP TRIGGER IF EXISTS trigger_missed_class_follow_up_insert ON class_bookings;
CREATE TRIGGER trigger_missed_class_follow_up_insert
  AFTER INSERT ON class_bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('no_show', 'missed'))
  EXECUTE FUNCTION enroll_missed_class_follow_up();

COMMENT ON FUNCTION enroll_missed_class_follow_up IS 
  'Auto-enrolls contacts in missed_class follow-up sequence when they miss a class booking';
