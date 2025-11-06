-- Check which beaches are missing grid_id values

-- Count beaches without grid_id
SELECT
  COUNT(*) FILTER (WHERE grid_id IS NULL) as beaches_without_grid_id,
  COUNT(*) FILTER (WHERE grid_id IS NOT NULL) as beaches_with_grid_id,
  COUNT(*) as total_beaches
FROM beaches;

-- Show beaches without grid_id
SELECT
  id,
  "Name",
  "COUNTY",
  "LATITUDE",
  "LONGITUDE",
  grid_id
FROM beaches
WHERE grid_id IS NULL
ORDER BY "Name"
LIMIT 20;

-- If you want to see ALL beaches without grid_id, remove the LIMIT
