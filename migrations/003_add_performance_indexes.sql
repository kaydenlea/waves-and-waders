-- Migration: Add performance indexes
-- Optimizes common query patterns

-- Forecast data queries (beach + timestamp range)
CREATE INDEX IF NOT EXISTS idx_forecast_beach_timestamp
  ON forecast_data(beach_id, timestamp DESC);

-- County tide queries (county + timestamp range)
CREATE INDEX IF NOT EXISTS idx_county_tides_county_timestamp
  ON county_tides_15min(county, timestamp DESC);

-- Daily conditions queries (county + date)
CREATE INDEX IF NOT EXISTS idx_daily_conditions_county_date
  ON daily_county_conditions(county, date DESC);

-- User favorites (for checking if beach is favorited)
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_beach
  ON user_favorite_beaches(user_id, beach_id);

-- Beaches by county (for grouping)
CREATE INDEX IF NOT EXISTS idx_beaches_county
  ON beaches("COUNTY");

-- Beaches with coordinates (for map filtering)
CREATE INDEX IF NOT EXISTS idx_beaches_coordinates
  ON beaches("LATITUDE", "LONGITUDE")
  WHERE "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL;

-- Add comments
COMMENT ON INDEX idx_forecast_beach_timestamp IS 'Optimizes forecast queries by beach and time range';
COMMENT ON INDEX idx_county_tides_county_timestamp IS 'Optimizes county tide queries';
COMMENT ON INDEX idx_daily_conditions_county_date IS 'Optimizes daily conditions lookup';
COMMENT ON INDEX idx_user_favorites_user_beach IS 'Fast favorite status checks';
COMMENT ON INDEX idx_beaches_county IS 'Supports grouping beaches by county';
COMMENT ON INDEX idx_beaches_coordinates IS 'Optimizes map viewport queries';
