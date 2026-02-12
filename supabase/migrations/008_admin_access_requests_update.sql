-- Allow users to update their own admin_access_requests row (needed for upsert on repeat visit).
DROP POLICY IF EXISTS "Admin requests update own" ON admin_access_requests;
CREATE POLICY "Admin requests update own" ON admin_access_requests
  FOR UPDATE TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));
