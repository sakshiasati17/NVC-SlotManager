-- Log every new confirmed booking to audit_log for simple analytics (signup count).
-- Runs in DB so it covers both email-confirm flow and direct POST /api/bookings.
CREATE OR REPLACE FUNCTION audit_booking_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    INSERT INTO public.audit_log (event_id, action, resource_type, resource_id)
    VALUES (NEW.event_id, 'booking_confirmed', 'booking', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS bookings_audit_confirmed ON bookings;
CREATE TRIGGER bookings_audit_confirmed
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION audit_booking_confirmed();

-- One-time backfill: add booking_confirmed for existing confirmed bookings (so analytics are correct).
INSERT INTO public.audit_log (event_id, action, resource_type, resource_id)
SELECT event_id, 'booking_confirmed', 'booking', id
FROM public.bookings
WHERE status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1 FROM public.audit_log al
    WHERE al.resource_type = 'booking' AND al.resource_id = bookings.id AND al.action = 'booking_confirmed'
  );
