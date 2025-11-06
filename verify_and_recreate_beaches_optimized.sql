-- First, let's check what's being filtered
-- Run this to see what beaches are excluded by the current view:

SELECT
  COUNT(*) as total_beaches,
  COUNT(CASE WHEN "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL THEN 1 END) as with_coords,
  COUNT(CASE WHEN "LATITUDE" IS NULL OR "LONGITUDE" IS NULL THEN 1 END) as without_coords,
  COUNT(CASE WHEN to_bool_flag("INLND_AREA") = true THEN 1 END) as inland_areas
FROM beaches;

-- Check if there are beaches without coordinates or marked as inland
SELECT
  id,
  "Name",
  "LATITUDE",
  "LONGITUDE",
  "INLND_AREA"
FROM beaches
WHERE "LATITUDE" IS NULL
   OR "LONGITUDE" IS NULL
   OR to_bool_flag("INLND_AREA") = true
LIMIT 10;

-- Now recreate the view to include ALL beaches (removing filters)
-- This will include even beaches without coordinates or inland areas

DROP VIEW IF EXISTS beaches_optimized CASCADE;

CREATE VIEW beaches_optimized AS
SELECT
  id,
  "Name",
  "COUNTY",
  "LATITUDE",
  "LONGITUDE",

  -- Access & Fees (pre-converted to boolean)
  to_bool_flag("O_PUBLIC") as "O_PUBLIC",
  to_bool_flag("FEE") as "FEE",
  to_bool_flag("PARKING") as "PARKING",
  to_bool_flag("RSTRCTNS") as "RSTRCTNS",
  to_bool_flag("DSABLDACSS") as "DSABLDACSS",

  -- Facilities
  to_bool_flag("RESTROOMS") as "RESTROOMS",
  to_bool_flag("VISTOR_CTR") as "VISTOR_CTR",
  to_bool_flag("DOG_FRIEND") as "DOG_FRIEND",
  to_bool_flag("EZ4STROLLE") as "EZ4STROLLE",
  to_bool_flag("LIFEGUARD") as "LIFEGUARD",
  to_bool_flag("SHOWERS") as "SHOWERS",
  to_bool_flag("FOOD") as "FOOD",
  to_bool_flag("DRINKWTR") as "DRINKWTR",
  to_bool_flag("PCNC_AREA") as "PCNC_AREA",
  to_bool_flag("FIREPITS") as "FIREPITS",
  to_bool_flag("CAMPGROUND") as "CAMPGROUND",
  to_bool_flag("RV_CMP") as "RV_CMP",
  to_bool_flag("BT_FACILIT") as "BT_FACILIT",
  to_bool_flag("LIGHTHOUSE") as "LIGHTHOUSE",
  to_bool_flag("PIER") as "PIER",
  to_bool_flag("HAND_LAUNCH") as "HAND_LAUNCH",

  -- Beach Types
  to_bool_flag("SNDY_BEACH") as "SNDY_BEACH",
  to_bool_flag("DUNES") as "DUNES",
  to_bool_flag("RKY_SHORE") as "RKY_SHORE",
  to_bool_flag("UPLAND_BCH") as "UPLAND_BCH",
  to_bool_flag("STRM_CRDOR") as "STRM_CRDOR",
  to_bool_flag("WETLAND") as "WETLAND",
  to_bool_flag("BLUFF") as "BLUFF",
  to_bool_flag("BAY_LGN_LK") as "BAY_LGN_LK",
  to_bool_flag("URBN_WFRNT") as "URBN_WFRNT",
  to_bool_flag("INLND_AREA") as "INLND_AREA",
  to_bool_flag("STRS_BEACH") as "STRS_BEACH",
  to_bool_flag("PTH_BEACH") as "PTH_BEACH",
  to_bool_flag("BOARDWLK") as "BOARDWLK",

  -- Trails & Paths
  to_bool_flag("BLFTP_TRLS") as "BLFTP_TRLS",
  to_bool_flag("BLFTP_PRK") as "BLFTP_PRK",
  to_bool_flag("TRAIL_OR_P") as "TRAIL_OR_P",
  to_bool_flag("BIKE_PATH") as "BIKE_PATH",
  to_bool_flag("EQUEST_TRL") as "EQUEST_TRL",
  to_bool_flag("WLDLFE_VWG") as "WLDLFE_VWG",

  -- Activities
  to_bool_flag("SWIMMING") as "SWIMMING",
  to_bool_flag("DIVING") as "DIVING",
  to_bool_flag("SNORKLNG") as "SNORKLNG",
  to_bool_flag("TIDEPOOL") as "TIDEPOOL",
  to_bool_flag("PLAYGROUND") as "PLAYGROUND",
  to_bool_flag("SPORT_FLDS") as "SPORT_FLDS",
  to_bool_flag("VOLLEYBALL") as "VOLLEYBALL",
  to_bool_flag("WNDSRF_KIT") as "WNDSRF_KIT",
  to_bool_flag("KAYAKING") as "KAYAKING",
  to_bool_flag("SURFING") as "SURFING",
  to_bool_flag("FISHING") as "FISHING",
  to_bool_flag("BOATING") as "BOATING",

  -- Grid mapping (added for surf intensity)
  grid_id

FROM beaches;
-- NOTE: Removed WHERE clause - now includes ALL beaches!
-- Filtering for inland areas happens in the API/frontend instead

COMMENT ON VIEW beaches_optimized IS 'Optimized beaches view with pre-converted boolean flags and grid_id. Includes all beaches - filtering happens at API level.';

-- Verify the view has all beaches
SELECT
  (SELECT COUNT(*) FROM beaches) as beaches_count,
  (SELECT COUNT(*) FROM beaches_optimized) as view_count,
  CASE
    WHEN (SELECT COUNT(*) FROM beaches) = (SELECT COUNT(*) FROM beaches_optimized)
    THEN '✅ All beaches included'
    ELSE '❌ Some beaches missing'
  END as status;
