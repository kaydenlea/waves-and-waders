-- Migration: Create optimized beaches view
-- Pre-converts all boolean feature flags from strings to proper booleans at DB level
-- Reduces 80,000+ JavaScript conversions to zero for map rendering

-- Helper function for boolean conversion
CREATE OR REPLACE FUNCTION to_bool_flag(val TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF val IS NULL THEN
    RETURN false;
  END IF;

  RETURN UPPER(TRIM(val)) IN ('Y', 'YES', 'TRUE', 'T', '1');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create optimized view with pre-converted booleans
CREATE OR REPLACE VIEW beaches_optimized AS
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
  to_bool_flag("BOATING") as "BOATING"

FROM beaches
WHERE "LATITUDE" IS NOT NULL
  AND "LONGITUDE" IS NOT NULL
  AND (to_bool_flag("INLND_AREA") = false OR "INLND_AREA" IS NULL);  -- Exclude inland areas

-- Add comment
COMMENT ON VIEW beaches_optimized IS 'Optimized beaches view with pre-converted boolean flags. Use this for map and list queries to avoid client-side string→boolean conversions.';
