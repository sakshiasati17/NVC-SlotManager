-- Optional "Remind me 1 day before" preference per booking.
-- When false, cron skips the 24h reminder for that booking.

ALTER TABLE signup_verifications
  ADD COLUMN IF NOT EXISTS remind_1_day boolean NOT NULL DEFAULT true;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS remind_1_day boolean NOT NULL DEFAULT true;

-- Update complete_signup_verification to copy remind_1_day from verification to booking
CREATE OR REPLACE FUNCTION complete_signup_verification(tok TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  new_booking_id UUID;
  slot_capacity INT;
  existing_booking_id UUID;
  do_remind_1_day boolean;
BEGIN
  SELECT * INTO v FROM signup_verifications WHERE token = tok AND expires_at > NOW();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Link expired or invalid.');
  END IF;

  do_remind_1_day := COALESCE(v.remind_1_day, true);

  SELECT capacity INTO slot_capacity FROM slots WHERE id = v.slot_id;
  IF NOT FOUND OR slot_capacity IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Slot not found.');
  END IF;

  SELECT id INTO existing_booking_id FROM bookings WHERE slot_id = v.slot_id AND status = 'confirmed';
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Slot is already taken.');
  END IF;

  INSERT INTO bookings (slot_id, event_id, participant_email, participant_name, participant_phone, team_id, auth_user_id, status, remind_1_day)
  VALUES (v.slot_id, v.event_id, v.participant_email, v.participant_name, v.participant_phone, v.team_id, v.auth_user_id, 'confirmed', do_remind_1_day)
  RETURNING id INTO new_booking_id;

  DELETE FROM signup_verifications WHERE id = v.id;

  RETURN jsonb_build_object('ok', true, 'booking_id', new_booking_id);
END;
$$;
