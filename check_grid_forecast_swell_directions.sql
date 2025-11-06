-- Check if grid_forecast_data has swell direction columns and data

-- 1. Check the table structure (columns)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'grid_forecast_data'
  AND column_name LIKE '%swell%direction%'
ORDER BY column_name;

-- 2. Check if any rows have swell direction data
SELECT
  COUNT(*) as total_rows,
  COUNT(primary_swell_direction) as has_primary_direction,
  COUNT(secondary_swell_direction) as has_secondary_direction,
  COUNT(tertiary_swell_direction) as has_tertiary_direction,
  COUNT(primary_swell_height_ft) as has_primary_height,
  COUNT(secondary_swell_height_ft) as has_secondary_height,
  COUNT(tertiary_swell_height_ft) as has_tertiary_height
FROM grid_forecast_data;

-- 3. Show a sample row with all swell columns
SELECT
  grid_id,
  timestamp,
  primary_swell_height_ft,
  primary_swell_period_s,
  primary_swell_direction,
  secondary_swell_height_ft,
  secondary_swell_period_s,
  secondary_swell_direction,
  tertiary_swell_height_ft,
  tertiary_swell_period_s,
  tertiary_swell_direction,
  wind_direction_deg
FROM grid_forecast_data
ORDER BY timestamp DESC
LIMIT 5;

-- 4. Check specifically for recent data (last 24 hours)
SELECT
  grid_id,
  timestamp,
  primary_swell_direction,
  secondary_swell_direction,
  tertiary_swell_direction,
  wind_direction_deg
FROM grid_forecast_data
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 10;
