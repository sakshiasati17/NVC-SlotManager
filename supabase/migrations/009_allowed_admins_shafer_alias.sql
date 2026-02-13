-- Add Leah Shafer's alias so both leah.shafer@colorado.edu and shaferl@colorado.edu (any casing) work.
-- Matching is case-insensitive; Leah.Shafer@Colorado.EDU already covers leah.shafer@colorado.edu.
INSERT INTO allowed_admins (email) VALUES ('shaferl@colorado.edu') ON CONFLICT (email) DO NOTHING;
