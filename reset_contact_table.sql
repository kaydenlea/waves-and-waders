-- Complete reset of contact_submissions table with proper RLS policies

-- Drop all existing policies first
DROP POLICY IF EXISTS "Enable insert for all users" ON contact_submissions;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON contact_submissions;
DROP POLICY IF EXISTS "Anyone can submit contact form" ON contact_submissions;
DROP POLICY IF EXISTS "Only admins can read submissions" ON contact_submissions;

-- Drop the table completely
DROP TABLE IF EXISTS contact_submissions CASCADE;

-- Recreate the table
CREATE TABLE contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX idx_contact_submissions_read ON contact_submissions(read);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy for INSERT (allows anyone, including anon users)
CREATE POLICY "allow_insert_contact"
ON contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create policy for SELECT (only authenticated users can read)
CREATE POLICY "allow_select_contact"
ON contact_submissions
FOR SELECT
TO authenticated
USING (true);

-- Add table and column comments
COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from the website';
COMMENT ON COLUMN contact_submissions.read IS 'Whether this submission has been read by an admin';
COMMENT ON COLUMN contact_submissions.archived IS 'Whether this submission has been archived';
