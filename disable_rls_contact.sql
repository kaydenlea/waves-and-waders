-- Disable RLS for contact_submissions table
-- This is safe for a contact form since we don't need to restrict who can submit

-- Drop all policies
DROP POLICY IF EXISTS "allow_insert_contact" ON contact_submissions;
DROP POLICY IF EXISTS "allow_select_contact" ON contact_submissions;
DROP POLICY IF EXISTS "Enable insert for all users" ON contact_submissions;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON contact_submissions;

-- Disable RLS completely
ALTER TABLE contact_submissions DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'contact_submissions';
