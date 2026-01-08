-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE
);

-- Create index on created_at for efficient querying
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at
  ON contact_submissions(created_at DESC);

-- Create index on read status for filtering
CREATE INDEX IF NOT EXISTS idx_contact_submissions_read
  ON contact_submissions(read);

-- Add row level security
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to insert (submit contact form)
-- This allows anonymous users to submit the form
CREATE POLICY "Enable insert for all users"
  ON contact_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy to allow authenticated users to read submissions
-- Only authenticated users can view submissions
CREATE POLICY "Enable read for authenticated users only"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from the website';
COMMENT ON COLUMN contact_submissions.read IS 'Whether this submission has been read by an admin';
COMMENT ON COLUMN contact_submissions.archived IS 'Whether this submission has been archived';
