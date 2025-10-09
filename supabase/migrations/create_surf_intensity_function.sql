-- Create a function to get average surf max for all beaches on a specific date
CREATE OR REPLACE FUNCTION get_beach_surf_intensity_for_date(target_date date)
RETURNS TABLE (
  beach_id uuid,
  avg_surf_max numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    beach_id,
    AVG(surf_height_max_ft) as avg_surf_max
  FROM forecast_data
  WHERE DATE(timestamp) = target_date
    AND surf_height_max_ft IS NOT NULL
  GROUP BY beach_id;
$$;
