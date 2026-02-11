-- Optional: email where admin receives notifications (e.g. when all slots are filled)
ALTER TABLE events ADD COLUMN IF NOT EXISTS notify_email TEXT;
