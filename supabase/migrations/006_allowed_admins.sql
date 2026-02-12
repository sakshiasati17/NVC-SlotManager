-- Restrict admin access to I&E staff. Only users in allowed_admins (or who already created events / have event_roles) can access admin.
-- When someone not allowed tries admin, we record the request and notify staff (see app code).

-- Emails that are allowed to use admin (create/manage events). Add I&E staff here.
CREATE TABLE IF NOT EXISTS allowed_admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requests from users who tried to access admin but are not yet allowed. Staff can grant by inserting into allowed_admins.
CREATE TABLE IF NOT EXISTS admin_access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email)
);

-- Index for listing requests
CREATE INDEX IF NOT EXISTS idx_admin_access_requests_requested_at ON admin_access_requests(requested_at DESC);

-- RLS: allow authenticated users to read allowed_admins (app checks if current user's email is in the list)
ALTER TABLE allowed_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allowed admins readable by authenticated" ON allowed_admins;
CREATE POLICY "Allowed admins readable by authenticated" ON allowed_admins
  FOR SELECT TO authenticated USING (true);

-- Only existing allowed admins can insert/update/delete (for grant flow). For initial seed, run in SQL Editor as project owner.
DROP POLICY IF EXISTS "Allowed admins manage by allowed" ON allowed_admins;
CREATE POLICY "Allowed admins manage by allowed" ON allowed_admins
  FOR ALL TO authenticated
  USING ((SELECT 1 FROM allowed_admins a WHERE lower(a.email) = lower((auth.jwt() ->> 'email'))) = 1)
  WITH CHECK ((SELECT 1 FROM allowed_admins a WHERE lower(a.email) = lower((auth.jwt() ->> 'email'))) = 1);

-- Allow any authenticated user to insert their own admin access request (so we can record when they try)
ALTER TABLE admin_access_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin requests insert own" ON admin_access_requests;
CREATE POLICY "Admin requests insert own" ON admin_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

-- Allow allowed admins to read all requests (for future UI to approve)
DROP POLICY IF EXISTS "Admin requests select by allowed" ON admin_access_requests;
CREATE POLICY "Admin requests select by allowed" ON admin_access_requests
  FOR SELECT TO authenticated
  USING ((SELECT 1 FROM allowed_admins a WHERE lower(a.email) = lower((auth.jwt() ->> 'email'))) = 1);

-- Allow users to read their own request row (so app can avoid sending duplicate notification emails)
DROP POLICY IF EXISTS "Admin requests select own" ON admin_access_requests;
CREATE POLICY "Admin requests select own" ON admin_access_requests
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- Seed allowed admins (safe to re-run). These can use /admin/login without verification.
INSERT INTO allowed_admins (email) VALUES ('saas9993@colorado.edu') ON CONFLICT (email) DO NOTHING;
INSERT INTO allowed_admins (email) VALUES ('hickorys@colorado.edu') ON CONFLICT (email) DO NOTHING;
INSERT INTO allowed_admins (email) VALUES ('Zoe.Unsell@colorado.edu') ON CONFLICT (email) DO NOTHING;
INSERT INTO allowed_admins (email) VALUES ('Dahni.Austin@colorado.edu') ON CONFLICT (email) DO NOTHING;
INSERT INTO allowed_admins (email) VALUES ('Leah.Shafer@Colorado.EDU') ON CONFLICT (email) DO NOTHING;
INSERT INTO allowed_admins (email) VALUES ('Karen.Reid@colorado.edu') ON CONFLICT (email) DO NOTHING;
