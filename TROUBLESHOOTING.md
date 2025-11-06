# Troubleshooting: Map Color Coding Not Showing

## Quick Checklist

### 1. ✅ Database Migration Applied
Run this in Supabase SQL Editor to verify:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'beaches_optimized' AND column_name = 'grid_id';
```
Should return one row with `grid_id`.

### 2. ✅ Dev Server Restarted
After changing API code, you MUST restart:
```bash
# Stop the server (Ctrl+C)
npm run dev
```

### 3. ✅ Browser Cache Cleared
Hard reload the page:
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

Or clear browser cache completely.

### 4. Check Browser Console

Open DevTools (F12) and look for these specific console messages:

#### Expected Messages (in order):

1. **Beaches Loading:**
   ```
   Loading beaches from API...
   Beaches API response: {success: true, data: Array(1336)}
   InteractiveMap: loaded beaches 1336
   Sample beach: {id: "...", name: "...", grid_id: 76, ...}
   Beaches with grid_id: 1336 / 1336
   ```
   ⚠️ If `grid_id` is undefined or missing, the API didn't restart properly.

2. **Surf Intensity Loading:**
   ```
   Fetching surf intensity for date: 2025-11-06
   ✅ Loaded surf intensity from daily_grid_table
   🔢 Number of beaches with intensity: 1000
   📝 Sample intensity values: [["beach-id-1", 14.75], ...]
   🎯 Non-zero values: 1000 / 1000
   ✅ setSurfIntensity called with 1000 entries
   ```
   ⚠️ If this doesn't appear, the date picker might not have a date selected.

3. **GeoJSON Building:**
   ```
   === Building GeoJSON ===
   surfIntensity object has 1000 entries
   filteredBeaches has 1336 beaches
   First 5 beach IDs and their intensities:
      Beach xxx: 14.75
      Beach xxx: 13.0
      ...
   Surf intensity distribution: {noData: 336, small: 257, moderate: 6, big: 737}
   ```
   ⚠️ If `surfIntensity object has 0 entries`, the data didn't load before GeoJSON was built.

## Common Issues & Solutions

### Issue 1: All beaches show 0 ft (gray)

**Symptom:** Console shows `surfIntensity object has 0 entries`

**Cause:** GeoJSON is building before surf intensity data loads.

**Solution:** The Source component has a `key` prop that should force re-render. Check line 1509 in InteractiveMap.tsx:
```tsx
<Source
  key={`beaches-${Object.keys(surfIntensity).length}`}
  ...
```

### Issue 2: grid_id is undefined in beaches

**Symptom:** Console shows `grid_id: undefined` in sample beach

**Causes:**
1. Migration not applied
2. Dev server not restarted
3. API still using old code

**Solution:**
1. Verify migration in database
2. **Restart dev server** (Ctrl+C, then `npm run dev`)
3. Hard reload browser

### Issue 3: Surf intensity distribution shows all `noData`

**Symptom:** Console shows `{noData: 1336, small: 0, moderate: 0, big: 0}`

**Cause:** Beach IDs don't match between surfIntensity object and beaches array.

**Debug:** Check if beach IDs match:
```javascript
// In console, after page loads:
console.log('First beach ID:', beaches[0]?.id);
console.log('First intensity key:', Object.keys(surfIntensity)[0]);
console.log('Do they match?', surfIntensity[beaches[0]?.id]);
```

### Issue 4: No console messages at all

**Causes:**
1. Console is filtered
2. Page didn't load
3. React error preventing render

**Solution:**
1. Clear console filters (top of DevTools console)
2. Check for React errors (red text in console)
3. Refresh page

## Manual Testing in Browser Console

After the page loads, paste this into the browser console:

```javascript
// Check if data is present
console.log('Beaches count:', beaches?.length);
console.log('Surf intensity count:', Object.keys(surfIntensity || {}).length);

// Check a specific beach
const firstBeach = beaches?.[0];
if (firstBeach) {
  console.log('First beach:', {
    id: firstBeach.id,
    name: firstBeach.name,
    grid_id: firstBeach.grid_id,
    intensity: surfIntensity?.[firstBeach.id]
  });
}

// Check distribution
const intensities = Object.values(surfIntensity || {});
console.log('Intensity stats:', {
  total: intensities.length,
  min: Math.min(...intensities),
  max: Math.max(...intensities),
  avg: intensities.reduce((a, b) => a + b, 0) / intensities.length
});
```

## Verification Script

Run this to verify the backend is working:

```bash
node debug_full_flow.js
```

All 6 steps should show ✅ SUCCESS.

## Still Not Working?

If you've tried all of the above and it's still not working, please provide:

1. **Full browser console output** (copy/paste everything)
2. **Screenshot** of the map showing all gray dots
3. **Output** of `node debug_full_flow.js`
4. **Confirmation** that you:
   - ✅ Ran the SQL migration
   - ✅ Restarted dev server
   - ✅ Hard reloaded browser

## Quick Test: Force a Date

The map only loads intensity when `selectedDate` is set. Try this:

1. Open the date picker on the page
2. Select today's date
3. Check if colors appear
4. Check console for the surf intensity loading messages

If colors appear after selecting a date, the issue was that `selectedDate` wasn't initialized.
