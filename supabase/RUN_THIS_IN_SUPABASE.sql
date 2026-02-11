-- ============================================================
-- NVC Slot Manager: run in Supabase SQL Editor (safe to re-run)
-- Dashboard → SQL Editor → New query → paste all → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for user roles (safe to re-run: skip if already exists)
DO $$
BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'coordinator', 'viewer', 'participant');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Events (admin-created)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC',
  show_contact BOOLEAN DEFAULT true,
  allow_swap BOOLEAN DEFAULT true,
  allow_waitlist BOOLEAN DEFAULT true,
  max_signups_per_participant INT DEFAULT 1,
  notify_email TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure notify_email exists (for DBs created before this column was added)
ALTER TABLE events ADD COLUMN IF NOT EXISTS notify_email TEXT;

-- Slots (belong to an event; bulk-generated)
CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  label TEXT,
  capacity INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, starts_at)
);

-- Teams (optional)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, name)
);

-- Bookings: one per slot (no double-book)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  participant_name TEXT,
  participant_phone TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlist_promoted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (slot_id)
);

-- Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  participant_name TEXT,
  participant_phone TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  position INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (slot_id, position)
);

-- Swap requests
CREATE TABLE IF NOT EXISTS swap_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  requester_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  target_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_booking_id != target_booking_id)
);

-- Event roles (admin/coordinator)
CREATE TABLE IF NOT EXISTS event_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'coordinator',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

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

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Which reminder emails have been sent (so we send 24h, 30m, 15m each once per booking)
CREATE TABLE IF NOT EXISTS reminder_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '30m', '15m')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_id, reminder_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_slots_event ON slots(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_slot ON waitlist(slot_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_event ON swap_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_signup_verifications_token ON signup_verifications(token);
CREATE INDEX IF NOT EXISTS idx_signup_verifications_expires ON signup_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_reminder_sent_booking ON reminder_sent(booking_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ========== RLS ==========
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reminder sent select" ON reminder_sent;
CREATE POLICY "Reminder sent select" ON reminder_sent FOR SELECT USING (true);
DROP POLICY IF EXISTS "Reminder sent insert" ON reminder_sent;
CREATE POLICY "Reminder sent insert" ON reminder_sent FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Signup verifications insert" ON signup_verifications;
CREATE POLICY "Signup verifications insert" ON signup_verifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- SELECT/DELETE only via SECURITY DEFINER RPCs below

CREATE OR REPLACE FUNCTION is_event_admin(eid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_roles
    WHERE event_id = eid AND user_id = auth.uid() AND role IN ('admin', 'coordinator')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_event_owner_or_admin(eid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM events WHERE id = eid AND created_by = auth.uid())
  OR is_event_admin(eid);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Events public read" ON events;
CREATE POLICY "Events public read" ON events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Events insert" ON events;
CREATE POLICY "Events insert" ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Events update" ON events;
CREATE POLICY "Events update" ON events FOR UPDATE USING (is_event_owner_or_admin(id));
DROP POLICY IF EXISTS "Events delete" ON events;
CREATE POLICY "Events delete" ON events FOR DELETE USING (is_event_owner_or_admin(id));

DROP POLICY IF EXISTS "Slots read" ON slots;
CREATE POLICY "Slots read" ON slots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Slots insert" ON slots;
CREATE POLICY "Slots insert" ON slots FOR INSERT WITH CHECK (is_event_owner_or_admin(event_id));
DROP POLICY IF EXISTS "Slots update" ON slots;
CREATE POLICY "Slots update" ON slots FOR UPDATE USING (is_event_owner_or_admin(event_id));
DROP POLICY IF EXISTS "Slots delete" ON slots;
CREATE POLICY "Slots delete" ON slots FOR DELETE USING (is_event_owner_or_admin(event_id));

DROP POLICY IF EXISTS "Teams read" ON teams;
CREATE POLICY "Teams read" ON teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Teams insert" ON teams;
CREATE POLICY "Teams insert" ON teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Teams update" ON teams;
CREATE POLICY "Teams update" ON teams FOR UPDATE USING (is_event_owner_or_admin(event_id) OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Bookings read" ON bookings;
CREATE POLICY "Bookings read" ON bookings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Bookings insert" ON bookings;
CREATE POLICY "Bookings insert" ON bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR true);
DROP POLICY IF EXISTS "Bookings update" ON bookings;
CREATE POLICY "Bookings update" ON bookings FOR UPDATE USING (
  auth_user_id = auth.uid() OR is_event_owner_or_admin(event_id)
);
DROP POLICY IF EXISTS "Bookings delete" ON bookings;
CREATE POLICY "Bookings delete" ON bookings FOR DELETE USING (
  auth_user_id = auth.uid() OR is_event_owner_or_admin(event_id)
);

DROP POLICY IF EXISTS "Waitlist read" ON waitlist;
CREATE POLICY "Waitlist read" ON waitlist FOR SELECT USING (true);
DROP POLICY IF EXISTS "Waitlist insert" ON waitlist;
CREATE POLICY "Waitlist insert" ON waitlist FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR true);
DROP POLICY IF EXISTS "Waitlist delete" ON waitlist;
CREATE POLICY "Waitlist delete" ON waitlist FOR DELETE USING (
  auth_user_id = auth.uid() OR is_event_owner_or_admin(event_id)
);

DROP POLICY IF EXISTS "Swap read" ON swap_requests;
CREATE POLICY "Swap read" ON swap_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = requester_booking_id AND b.auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = target_booking_id AND b.auth_user_id = auth.uid())
  OR is_event_owner_or_admin(event_id)
);
DROP POLICY IF EXISTS "Swap insert" ON swap_requests;
CREATE POLICY "Swap insert" ON swap_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Swap update" ON swap_requests;
CREATE POLICY "Swap update" ON swap_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = target_booking_id AND b.auth_user_id = auth.uid())
  OR is_event_owner_or_admin(event_id)
);

DROP POLICY IF EXISTS "Event roles read" ON event_roles;
CREATE POLICY "Event roles read" ON event_roles FOR SELECT USING (
  is_event_owner_or_admin(event_id) OR user_id = auth.uid()
);
DROP POLICY IF EXISTS "Event roles insert" ON event_roles;
CREATE POLICY "Event roles insert" ON event_roles FOR INSERT WITH CHECK (is_event_owner_or_admin(event_id));
DROP POLICY IF EXISTS "Event roles delete" ON event_roles;
CREATE POLICY "Event roles delete" ON event_roles FOR DELETE USING (is_event_owner_or_admin(event_id));

DROP POLICY IF EXISTS "Audit read" ON audit_log;
CREATE POLICY "Audit read" ON audit_log FOR SELECT USING (is_event_owner_or_admin(event_id));
DROP POLICY IF EXISTS "Audit insert" ON audit_log;
CREATE POLICY "Audit insert" ON audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ========== Swap accept RPC ==========
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

-- ========== Signup verification (email confirm before booking) ==========
-- Returns verification row if token valid and not expired; null otherwise.
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

-- Completes signup: creates booking from verification row, deletes verification. Callable with token only.
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
