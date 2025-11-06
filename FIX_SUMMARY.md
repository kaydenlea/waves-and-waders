# Fix Summary: Map Color Coding for Surf Intensity

## Problem
The map was showing all beaches as gray (0 ft surf intensity) even though the `daily_grid_surf_intensity` table had valid data. When hovering over beaches, they all showed "0 ft".

## Root Cause
The `beaches_optimized` view was missing the `grid_id` column, which is required to map beaches to their corresponding grid points in the `daily_grid_surf_intensity` table. Without this column:
1. The `/api/beaches` endpoint couldn't return `grid_id` values
2. The `/api/surf-intensity` endpoint couldn't match beaches to grid intensity data
3. All beaches defaulted to 0 ft intensity

## Changes Made

### 1. Updated `beaches_optimized` view
**File:** `migrations/003_add_grid_id_to_beaches_optimized.sql`

Added `grid_id` column to the view so it's available when fetching beaches.

### 2. Updated `/api/beaches` endpoint
**File:** `app/api/beaches/route.ts`

- Added `grid_id` to the SELECT columns (line 8)
- Added `grid_id` to the returned beach object (line 73)

### 3. Updated InteractiveMap TypeScript types
**File:** `components/visuals/InteractiveMap.tsx`

- Added `grid_id?: number` to the `BeachPoint` type (line 61)
- Added debugging logs to track surf intensity loading and mapping

### 4. Added Source key prop for re-rendering
**File:** `components/visuals/InteractiveMap.tsx`

- Added `key` prop to the `Source` component (line 1509) to force re-render when surf intensity data loads

## How to Apply the Fix

### Step 1: Apply Database Migration
Go to your Supabase SQL Editor and run:

```sql
-- Migration: Add grid_id to beaches_optimized view
CREATE OR REPLACE VIEW beaches_optimized AS
SELECT
  id,
  "Name",
  "COUNTY",
  "LATITUDE",
  "LONGITUDE",
  grid_id,  -- Add grid_id for surf intensity mapping

  -- ... (rest of the columns)
FROM beaches
WHERE "LATITUDE" IS NOT NULL
  AND "LONGITUDE" IS NOT NULL
  AND (to_bool_flag("INLND_AREA") = false OR "INLND_AREA" IS NULL);
```

*See the full SQL in `migrations/003_add_grid_id_to_beaches_optimized.sql`*

### Step 2: Restart Your Dev Server
```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

### Step 3: Clear Browser Cache
- Hard reload your browser (Ctrl+Shift+R or Cmd+Shift+R)
- Or clear cache and reload

## How to Verify the Fix

### 1. Check Browser Console
After the page loads, you should see:
```
Loaded surf intensity from daily_grid_table
Number of beaches with intensity: 1000
Beaches with grid_id: 1336 / 1336
Surf intensity distribution: { noData: 336, small: 255, moderate: 216, big: 529 }
```

### 2. Visual Check
- Open the map
- You should see beaches colored:
  - **Green** = small waves (< 3 ft)
  - **Orange** = moderate waves (3-6 ft)
  - **Red** = big waves (≥ 6 ft)
  - **Gray** = no data

### 3. Hover Check
- Hover over beaches
- The popup should show actual surf heights (e.g., "3.5 ft", "12.0 ft") instead of "0 ft"

## Verification Scripts

Run these to verify the data pipeline:

```bash
# Test the surf intensity API and mapping
node test_surf_intensity.js

# Verify the fix is working
node verify_fix.js
```

## Data Flow

The complete data flow for surf intensity coloring:

1. **Daily Grid Data:** Python script (`nowcast_grid.py`) populates `daily_grid_surf_intensity` table
   - One row per grid point per day
   - Contains `grid_id`, `date`, `avg_surf_max_ft`

2. **Beaches Table:** Each beach has a `grid_id` that maps it to a grid point
   - `beaches.grid_id` → `daily_grid_surf_intensity.grid_id`

3. **API Endpoints:**
   - `/api/beaches` → Returns all beaches WITH `grid_id`
   - `/api/surf-intensity?date=YYYY-MM-DD` → Maps grid intensity to beach IDs

4. **Map Component:**
   - Fetches beaches (including `grid_id`)
   - Fetches surf intensity (mapped by `grid_id`)
   - Merges data: `surfIntensity[beach.id]`
   - Renders colored dots based on intensity

## Files Modified

1. ✅ `migrations/003_add_grid_id_to_beaches_optimized.sql` (new file)
2. ✅ `app/api/beaches/route.ts`
3. ✅ `components/visuals/InteractiveMap.tsx`

## Files Created (for debugging/testing)

- `test_surf_intensity.js` - Tests the complete data pipeline
- `verify_fix.js` - Verifies the fix is working
- `apply_migration.js` - Helper to show migration instructions

## Next Steps

After applying the fix, you may want to:

1. Remove or reduce the debugging `console.log` statements in `InteractiveMap.tsx` once confirmed working
2. Clean up the test scripts (`test_surf_intensity.js`, `verify_fix.js`, `apply_migration.js`)
3. Verify color coding updates correctly when changing the date picker

## Troubleshooting

If you still see all gray dots:

1. **Check the migration was applied:**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'beaches_optimized' AND column_name = 'grid_id';
   ```
   Should return one row.

2. **Check beaches have grid_id:**
   ```sql
   SELECT COUNT(*) FROM beaches WHERE grid_id IS NOT NULL;
   ```
   Should return ~1300+

3. **Check daily intensity data exists:**
   ```sql
   SELECT COUNT(*) FROM daily_grid_surf_intensity WHERE date = CURRENT_DATE;
   ```
   Should return 36 (one per grid point)

4. **Check browser console** for errors or warnings
