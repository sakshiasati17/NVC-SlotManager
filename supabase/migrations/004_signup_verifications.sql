-- Add signup_verifications table if missing (fix: "Could not find the table 'public.signup_verifications' in the schema cache")
-- Run this in Supabase → SQL Editor if participant signup fails with that error.

-- Signup verifications: confirm participant email before creating booking
CREATE TABLE IF NOT EXISTS signup_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  participant_name TEXT,
  participant_phone TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_name TEXT,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signup_verifications_token ON signup_verifications(token);
CREATE INDEX IF NOT EXISTS idx_signup_verifications_expires ON signup_verifications(expires_at);

ALTER TABLE signup_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signup verifications insert" ON signup_verifications;
CREATE POLICY "Signup verifications insert" ON signup_verifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RPC: get verification row by token (for confirm page)
CREATE OR REPLACE FUNCTION get_signup_verification(tok TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT id, event_id, slot_id, auth_user_id, participant_email, participant_name, participant_phone, team_id, team_name, expires_at
  INTO r FROM signup_verifications WHERE token = tok AND expires_at > NOW();
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', r.id, 'event_id', r.event_id, 'slot_id', r.slot_id, 'auth_user_id', r.auth_user_id,
    'participant_email', r.participant_email, 'participant_name', r.participant_name,
    'participant_phone', r.participant_phone, 'team_id', r.team_id, 'team_name', r.team_name,
    'expires_at', r.expires_at
  );
END;
$$;

-- RPC: create booking from verification and delete verification
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
BEGIN
  SELECT * INTO v FROM signup_verifications WHERE token = tok AND expires_at > NOW();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Link expired or invalid.');
  END IF;

  SELECT capacity INTO slot_capacity FROM slots WHERE id = v.slot_id;
  IF NOT FOUND OR slot_capacity IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Slot not found.');
  END IF;

  SELECT id INTO existing_booking_id FROM bookings WHERE slot_id = v.slot_id AND status = 'confirmed';
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Slot is already taken.');
  END IF;

  INSERT INTO bookings (slot_id, event_id, participant_email, participant_name, participant_phone, team_id, auth_user_id, status)
  VALUES (v.slot_id, v.event_id, v.participant_email, v.participant_name, v.participant_phone, v.team_id, v.auth_user_id, 'confirmed')
  RETURNING id INTO new_booking_id;

  DELETE FROM signup_verifications WHERE id = v.id;

  RETURN jsonb_build_object('ok', true, 'booking_id', new_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION get_signup_verification(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_signup_verification(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_signup_verification(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION complete_signup_verification(TEXT) TO authenticated;
