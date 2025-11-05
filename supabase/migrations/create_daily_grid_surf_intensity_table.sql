DROP TABLE IF EXISTS daily_grid_surf_intensity;

-- Create a table to store daily surf intensity (average max) per grid point
CREATE TABLE daily_grid_surf_intensity (
  grid_id integer NOT NULL,
  date date NOT NULL,
  avg_surf_max_ft numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (grid_id, date)
);

-- Create index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_daily_grid_surf_intensity_date ON daily_grid_surf_intensity(date);

DROP FUNCTION IF EXISTS refresh_daily_grid_surf_intensity(target_date date);

-- Create a function to refresh/populate the daily grid surf intensity table
CREATE OR REPLACE FUNCTION refresh_daily_grid_surf_intensity(target_date date)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete existing data for this date
  DELETE FROM daily_grid_surf_intensity WHERE date = target_date;

  -- Insert aggregated data
  INSERT INTO daily_grid_surf_intensity (grid_id, date, avg_surf_max_ft)
  SELECT
    grid_id,
    target_date AS date,
    AVG(surf_height_max_ft) AS avg_surf_max_ft
  FROM grid_forecast_data
  WHERE DATE(timestamp) = target_date
    AND surf_height_max_ft IS NOT NULL
  GROUP BY grid_id;
END;
$$;

-- Initial population example:
-- SELECT refresh_daily_grid_surf_intensity('2025-10-07');
