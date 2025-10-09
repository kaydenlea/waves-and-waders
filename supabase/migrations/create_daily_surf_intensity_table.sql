-- Create a table to store daily surf intensity (average max) per beach
CREATE TABLE IF NOT EXISTS daily_beach_surf_intensity (
  beach_id uuid NOT NULL,
  date date NOT NULL,
  avg_surf_max_ft numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (beach_id, date)
);

-- Create index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_daily_surf_intensity_date ON daily_beach_surf_intensity(date);

-- Create a function to refresh/populate the daily surf intensity table
CREATE OR REPLACE FUNCTION refresh_daily_beach_surf_intensity(target_date date)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete existing data for this date
  DELETE FROM daily_beach_surf_intensity WHERE date = target_date;

  -- Insert aggregated data
  INSERT INTO daily_beach_surf_intensity (beach_id, date, avg_surf_max_ft)
  SELECT
    beach_id,
    target_date as date,
    AVG(surf_height_max_ft) as avg_surf_max_ft
  FROM forecast_data
  WHERE DATE(timestamp) = target_date
    AND surf_height_max_ft IS NOT NULL
  GROUP BY beach_id;
END;
$$;

-- Initial population: run this for each date you have data for
-- Example: SELECT refresh_daily_beach_surf_intensity('2025-10-07');
