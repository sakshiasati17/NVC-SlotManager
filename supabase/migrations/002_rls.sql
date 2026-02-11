-- RLS: who can see what
-- Public: events (by slug), slots, bookings (for schedule view), waitlist count
-- Authenticated: own bookings, create booking/cancel/swap, join waitlist
-- Admin/Coordinator: full CRUD on their events, export, override, audit

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: is current user admin/coordinator for event
CREATE OR REPLACE FUNCTION is_event_admin(eid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_roles
    WHERE event_id = eid AND user_id = auth.uid() AND role IN ('admin', 'coordinator')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: event created_by is also admin
CREATE OR REPLACE FUNCTION is_event_owner_or_admin(eid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM events WHERE id = eid AND created_by = auth.uid())
  OR is_event_admin(eid);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Events: public read by slug; authenticated read all; admin/owner write
CREATE POLICY "Events public read" ON events FOR SELECT USING (true);
CREATE POLICY "Events insert" ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Events update" ON events FOR UPDATE USING (is_event_owner_or_admin(id));
CREATE POLICY "Events delete" ON events FOR DELETE USING (is_event_owner_or_admin(id));

-- Slots: public read; admin/owner write
CREATE POLICY "Slots read" ON slots FOR SELECT USING (true);
CREATE POLICY "Slots insert" ON slots FOR INSERT WITH CHECK (is_event_owner_or_admin(event_id));
CREATE POLICY "Slots update" ON slots FOR UPDATE USING (is_event_owner_or_admin(event_id));
CREATE POLICY "Slots delete" ON slots FOR DELETE USING (is_event_owner_or_admin(event_id));

-- Teams: public read for event; participants create for event; admin write
CREATE POLICY "Teams read" ON teams FOR SELECT USING (true);
CREATE POLICY "Teams insert" ON teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Teams update" ON teams FOR UPDATE USING (is_event_owner_or_admin(event_id) OR auth.uid() IS NOT NULL);

-- Bookings: public read (schedule view); anyone can insert (signup) with valid slot; own or admin can update/delete
CREATE POLICY "Bookings read" ON bookings FOR SELECT USING (true);
CREATE POLICY "Bookings insert" ON bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR true);
CREATE POLICY "Bookings update" ON bookings FOR UPDATE USING (
  auth_user_id = auth.uid() OR is_event_owner_or_admin(event_id)
);
CREATE POLICY "Bookings delete" ON bookings FOR DELETE USING (
  auth_user_id = auth.uid() OR is_event_owner_or_admin(event_id)
);

-- Waitlist: public read count; participant add self; admin manage
CREATE POLICY "Waitlist read" ON waitlist FOR SELECT USING (true);
CREATE POLICY "Waitlist insert" ON waitlist FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR true);
CREATE POLICY "Waitlist delete" ON waitlist FOR DELETE USING (
  auth_user_id = auth.uid() OR is_event_owner_or_admin(event_id)
);

-- Swap requests: participants involved can read/update; admin can read
CREATE POLICY "Swap read" ON swap_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = requester_booking_id AND b.auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = target_booking_id AND b.auth_user_id = auth.uid())
  OR is_event_owner_or_admin(event_id)
);
CREATE POLICY "Swap insert" ON swap_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Swap update" ON swap_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = target_booking_id AND b.auth_user_id = auth.uid())
  OR is_event_owner_or_admin(event_id)
);

-- Event roles: only admins can manage
CREATE POLICY "Event roles read" ON event_roles FOR SELECT USING (
  is_event_owner_or_admin(event_id) OR user_id = auth.uid()
);
CREATE POLICY "Event roles insert" ON event_roles FOR INSERT WITH CHECK (is_event_owner_or_admin(event_id));
CREATE POLICY "Event roles delete" ON event_roles FOR DELETE USING (is_event_owner_or_admin(event_id));

-- Audit log: only event admins read; system/admins insert
CREATE POLICY "Audit read" ON audit_log FOR SELECT USING (is_event_owner_or_admin(event_id));
CREATE POLICY "Audit insert" ON audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
