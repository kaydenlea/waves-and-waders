-- Count NULL instances per attribute in forecast_data table
-- Run this in Supabase SQL Editor to see data completeness

-- Option 1: Single query showing all NULL counts
SELECT
  COUNT(*) as total_rows,

  -- Swell data
  COUNT(*) - COUNT(primary_swell_height_ft) as primary_swell_height_nulls,
  COUNT(*) - COUNT(primary_swell_period_s) as primary_swell_period_nulls,
  COUNT(*) - COUNT(primary_swell_direction) as primary_swell_direction_nulls,

  COUNT(*) - COUNT(secondary_swell_height_ft) as secondary_swell_height_nulls,
  COUNT(*) - COUNT(secondary_swell_period_s) as secondary_swell_period_nulls,
  COUNT(*) - COUNT(secondary_swell_direction) as secondary_swell_direction_nulls,

  COUNT(*) - COUNT(tertiary_swell_height_ft) as tertiary_swell_height_nulls,
  COUNT(*) - COUNT(tertiary_swell_period_s) as tertiary_swell_period_nulls,
  COUNT(*) - COUNT(tertiary_swell_direction) as tertiary_swell_direction_nulls,

  -- Surf data
  COUNT(*) - COUNT(surf_height_min_ft) as surf_height_min_nulls,
  COUNT(*) - COUNT(surf_height_max_ft) as surf_height_max_nulls,
  COUNT(*) - COUNT(wave_energy_kj) as wave_energy_nulls,

  -- Water conditions
  COUNT(*) - COUNT(water_temp_f) as water_temp_nulls,
  COUNT(*) - COUNT(tide_level_ft) as tide_level_nulls,

  -- Wind data
  COUNT(*) - COUNT(wind_speed_mph) as wind_speed_nulls,
  COUNT(*) - COUNT(wind_gust_mph) as wind_gust_nulls,
  COUNT(*) - COUNT(wind_direction_deg) as wind_direction_nulls,

  -- Weather
  COUNT(*) - COUNT(temperature) as air_temperature_nulls,
  COUNT(*) - COUNT(weather) as weather_code_nulls,
  COUNT(*) - COUNT(pressure_inhg) as pressure_nulls
FROM forecast_data;


-- Option 2: Vertical format (easier to read)
-- Shows attribute name, null count, and null percentage
SELECT *
FROM (
  SELECT
    0 as sort_order,
    'Total Rows' as attribute,
    COUNT(*)::text as value,
    '100%' as completeness
  FROM forecast_data

  UNION ALL

  SELECT
    1 as sort_order,
    attribute,
    null_count::text as value,
    ROUND(((total_rows - null_count)::numeric / total_rows * 100), 2)::text || '%' as completeness
  FROM (
    SELECT
      'primary_swell_height_ft' as attribute,
      COUNT(*) as total_rows,
      COUNT(*) - COUNT(primary_swell_height_ft) as null_count
    FROM forecast_data

    UNION ALL
    SELECT 'primary_swell_period_s', COUNT(*), COUNT(*) - COUNT(primary_swell_period_s) FROM forecast_data
    UNION ALL
    SELECT 'primary_swell_direction', COUNT(*), COUNT(*) - COUNT(primary_swell_direction) FROM forecast_data

    UNION ALL
    SELECT 'secondary_swell_height_ft', COUNT(*), COUNT(*) - COUNT(secondary_swell_height_ft) FROM forecast_data
    UNION ALL
    SELECT 'secondary_swell_period_s', COUNT(*), COUNT(*) - COUNT(secondary_swell_period_s) FROM forecast_data
    UNION ALL
    SELECT 'secondary_swell_direction', COUNT(*), COUNT(*) - COUNT(secondary_swell_direction) FROM forecast_data

    UNION ALL
    SELECT 'tertiary_swell_height_ft', COUNT(*), COUNT(*) - COUNT(tertiary_swell_height_ft) FROM forecast_data
    UNION ALL
    SELECT 'tertiary_swell_period_s', COUNT(*), COUNT(*) - COUNT(tertiary_swell_period_s) FROM forecast_data
    UNION ALL
    SELECT 'tertiary_swell_direction', COUNT(*), COUNT(*) - COUNT(tertiary_swell_direction) FROM forecast_data

    UNION ALL
    SELECT 'surf_height_min_ft', COUNT(*), COUNT(*) - COUNT(surf_height_min_ft) FROM forecast_data
    UNION ALL
    SELECT 'surf_height_max_ft', COUNT(*), COUNT(*) - COUNT(surf_height_max_ft) FROM forecast_data
    UNION ALL
    SELECT 'wave_energy_kj', COUNT(*), COUNT(*) - COUNT(wave_energy_kj) FROM forecast_data

    UNION ALL
    SELECT 'water_temp_f', COUNT(*), COUNT(*) - COUNT(water_temp_f) FROM forecast_data
    UNION ALL
    SELECT 'tide_level_ft', COUNT(*), COUNT(*) - COUNT(tide_level_ft) FROM forecast_data

    UNION ALL
    SELECT 'wind_speed_mph', COUNT(*), COUNT(*) - COUNT(wind_speed_mph) FROM forecast_data
    UNION ALL
    SELECT 'wind_gust_mph', COUNT(*), COUNT(*) - COUNT(wind_gust_mph) FROM forecast_data
    UNION ALL
    SELECT 'wind_direction_deg', COUNT(*), COUNT(*) - COUNT(wind_direction_deg) FROM forecast_data

    UNION ALL
    SELECT 'temperature (air)', COUNT(*), COUNT(*) - COUNT(temperature) FROM forecast_data
    UNION ALL
    SELECT 'weather_code', COUNT(*), COUNT(*) - COUNT(weather) FROM forecast_data
    UNION ALL
    SELECT 'pressure_inhg', COUNT(*), COUNT(*) - COUNT(pressure_inhg) FROM forecast_data
  ) subquery
) final_query
ORDER BY sort_order, attribute;


-- Option 3: Group by beach to see which beaches have most missing data
SELECT
  beach_id,
  COUNT(*) as total_records,
  COUNT(*) - COUNT(surf_height_max_ft) as surf_nulls,
  COUNT(*) - COUNT(wind_speed_mph) as wind_nulls,
  COUNT(*) - COUNT(water_temp_f) as water_temp_nulls,
  COUNT(*) - COUNT(tide_level_ft) as tide_nulls,
  ROUND(((COUNT(*) - COUNT(surf_height_max_ft))::numeric / COUNT(*) * 100), 2) as surf_null_pct
FROM forecast_data
GROUP BY beach_id
ORDER BY surf_null_pct DESC
LIMIT 20;


-- Option 4: Most recent data completeness (last 7 days)
SELECT
  COUNT(*) as total_rows_last_7_days,
  COUNT(*) - COUNT(surf_height_max_ft) as surf_nulls,
  COUNT(*) - COUNT(wind_speed_mph) as wind_nulls,
  COUNT(*) - COUNT(water_temp_f) as water_temp_nulls,
  ROUND(((COUNT(surf_height_max_ft)::numeric / COUNT(*) * 100)), 2) as surf_completeness_pct
FROM forecast_data
WHERE timestamp >= NOW() - INTERVAL '7 days';


-- Option 5: Completely empty rows (all critical fields null)
SELECT
  COUNT(*) as completely_empty_rows
FROM forecast_data
WHERE
  surf_height_max_ft IS NULL
  AND wind_speed_mph IS NULL
  AND water_temp_f IS NULL
  AND primary_swell_height_ft IS NULL;
