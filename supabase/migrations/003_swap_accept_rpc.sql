-- RPC to perform swap accept: cancel both bookings, create two new ones with swapped slots.
-- Callable by the target user (person who accepts); runs with SECURITY DEFINER so it can update both rows.

CREATE OR REPLACE FUNCTION accept_swap(swap_request_id UUID, accepting_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sr RECORD;
  req_booking RECORD;
  tgt_booking RECORD;
  new_req_slot_id UUID;
  new_tgt_slot_id UUID;
BEGIN
  SELECT * INTO sr FROM swap_requests WHERE id = swap_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Swap request not found or already handled');
  END IF;

  SELECT * INTO tgt_booking FROM bookings WHERE id = sr.target_booking_id AND status = 'confirmed';
  IF NOT FOUND OR tgt_booking.auth_user_id IS DISTINCT FROM accepting_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized to accept this swap');
  END IF;

  SELECT * INTO req_booking FROM bookings WHERE id = sr.requester_booking_id AND status = 'confirmed';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Requester booking no longer valid');
  END IF;

  new_req_slot_id := tgt_booking.slot_id;
  new_tgt_slot_id := req_booking.slot_id;

  UPDATE swap_requests SET status = 'accepted', responded_at = NOW() WHERE id = swap_request_id;

  UPDATE bookings SET status = 'cancelled' WHERE id IN (sr.requester_booking_id, sr.target_booking_id);

  INSERT INTO bookings (slot_id, event_id, participant_email, participant_name, participant_phone, team_id, auth_user_id, status)
  VALUES
    (new_req_slot_id, sr.event_id, req_booking.participant_email, req_booking.participant_name, req_booking.participant_phone, req_booking.team_id, req_booking.auth_user_id, 'confirmed'),
    (new_tgt_slot_id, sr.event_id, tgt_booking.participant_email, tgt_booking.participant_name, tgt_booking.participant_phone, tgt_booking.team_id, tgt_booking.auth_user_id, 'confirmed');

  RETURN jsonb_build_object('ok', true);
END;
$$;
