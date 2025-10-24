-- Migration: Optimize beach lookup performance
-- Creates RPC function for smart beach finding (reduces 4 queries to 1)

-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create smart beach finder function
CREATE OR REPLACE FUNCTION find_beach_smart(search_term TEXT)
RETURNS TABLE (
  id uuid,
  "Name" text,
  "LATITUDE" double precision,
  "LONGITUDE" double precision,
  "COUNTY" text
) AS $$
BEGIN
  -- Try 1: Exact ID match (UUID or numeric string)
  RETURN QUERY
  SELECT b.id, b."Name", b."LATITUDE", b."LONGITUDE", b."COUNTY"
  FROM beaches b
  WHERE b.id::text = search_term
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Try 2: Exact name match (case-insensitive)
  RETURN QUERY
  SELECT b.id, b."Name", b."LATITUDE", b."LONGITUDE", b."COUNTY"
  FROM beaches b
  WHERE LOWER(b."Name") = LOWER(search_term)
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Try 3: Slug-style match (replace dashes with spaces)
  RETURN QUERY
  SELECT b.id, b."Name", b."LATITUDE", b."LONGITUDE", b."COUNTY"
  FROM beaches b
  WHERE LOWER(b."Name") = LOWER(REPLACE(search_term, '-', ' '))
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Try 4: Fuzzy match using similarity (trigram search)
  -- Returns best match above 0.3 similarity threshold
  RETURN QUERY
  SELECT b.id, b."Name", b."LATITUDE", b."LONGITUDE", b."COUNTY"
  FROM beaches b
  WHERE
    LOWER(b."Name") LIKE '%' || LOWER(search_term) || '%'
    OR similarity(LOWER(b."Name"), LOWER(REPLACE(search_term, '-', ' '))) > 0.3
  ORDER BY similarity(LOWER(b."Name"), LOWER(REPLACE(search_term, '-', ' '))) DESC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Try 5: Match just first part (before parentheses/brackets)
  RETURN QUERY
  SELECT b.id, b."Name", b."LATITUDE", b."LONGITUDE", b."COUNTY"
  FROM beaches b
  WHERE LOWER(SPLIT_PART(b."Name", '(', 1)) LIKE '%' || LOWER(REPLACE(search_term, '-', ' ')) || '%'
  ORDER BY LENGTH(b."Name")  -- Prefer shorter names
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_beaches_name_trgm ON beaches USING gin ("Name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_beaches_name_lower ON beaches (LOWER("Name"));

-- Add comment
COMMENT ON FUNCTION find_beach_smart IS 'Smart beach finder that tries multiple strategies: exact ID, exact name, slug match, fuzzy match, and partial match. Returns first match found.';
