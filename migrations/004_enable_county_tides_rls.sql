-- Enable RLS and create policy for county_tides_15min table
-- This allows the frontend (using anon key) to read tide data

-- Enable RLS on the table
ALTER TABLE county_tides_15min ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access to county tides"
ON county_tides_15min
FOR SELECT
TO anon, authenticated
USING (true);

-- Add comment
COMMENT ON POLICY "Allow public read access to county tides" ON county_tides_15min
IS 'Allows frontend to query tide data using anon key';
