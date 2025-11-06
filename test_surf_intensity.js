// Test script to verify surf intensity data fetching
// Run with: node test_surf_intensity.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSurfIntensity() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  console.log(`\nTesting surf intensity for date: ${today}\n`);

  // 1. Check daily_grid_surf_intensity table
  console.log('--- Checking daily_grid_surf_intensity table ---');
  const { data: dailyData, error: dailyError } = await supabase
    .from('daily_grid_surf_intensity')
    .select('grid_id, date, avg_surf_max_ft')
    .eq('date', today)
    .order('grid_id', { ascending: true })
    .limit(10);

  if (dailyError) {
    console.error('Error fetching daily grid intensity:', dailyError);
  } else {
    console.log(`Found ${dailyData?.length || 0} records in daily_grid_surf_intensity for ${today}`);
    if (dailyData && dailyData.length > 0) {
      console.log('Sample records:');
      dailyData.slice(0, 5).forEach(record => {
        console.log(`  Grid ${record.grid_id}: ${record.avg_surf_max_ft?.toFixed(2)} ft`);
      });
    }
  }

  // 2. Check beach-to-grid mapping
  console.log('\n--- Checking beach-to-grid mapping ---');
  const { data: beachData, error: beachError } = await supabase
    .from('beaches')
    .select('id, Name, grid_id')
    .not('grid_id', 'is', null)
    .limit(10);

  if (beachError) {
    console.error('Error fetching beaches:', beachError);
  } else {
    console.log(`Found ${beachData?.length || 0} beaches with grid_id`);
    if (beachData && beachData.length > 0) {
      console.log('Sample beach mappings:');
      beachData.slice(0, 5).forEach(beach => {
        console.log(`  Beach ${beach.id} (${beach.Name}): grid_id = ${beach.grid_id}`);
      });

      // Check the ID types
      console.log(`\nBeach ID type: ${typeof beachData[0].id}`);
      console.log(`Beach ID example: "${beachData[0].id}"`);
    }
  }

  // 3. Test the full API logic
  console.log('\n--- Testing API logic (simulated) ---');

  // Build beach-to-grid map
  const { data: allBeaches, error: mapError } = await supabase
    .from('beaches')
    .select('id, grid_id')
    .not('grid_id', 'is', null);

  if (mapError) {
    console.error('Error building beach map:', mapError);
    return;
  }

  const beachMap = new Map();
  for (const row of allBeaches || []) {
    if (row.grid_id == null) continue;
    if (!beachMap.has(row.grid_id)) {
      beachMap.set(row.grid_id, []);
    }
    beachMap.get(row.grid_id).push(String(row.id));
  }

  console.log(`Built map: ${beachMap.size} grid points mapped to beaches`);

  // Fetch intensity data
  const { data: intensityData } = await supabase
    .from('daily_grid_surf_intensity')
    .select('grid_id, avg_surf_max_ft')
    .eq('date', today)
    .order('grid_id', { ascending: true });

  // Map to beaches
  const result = {};
  for (const row of intensityData || []) {
    if (row.grid_id == null || row.avg_surf_max_ft == null) continue;
    const beaches = beachMap.get(row.grid_id);
    if (!beaches || beaches.length === 0) continue;

    for (const beachId of beaches) {
      result[beachId] = Number(row.avg_surf_max_ft);
    }
  }

  console.log(`\nFinal result: ${Object.keys(result).length} beaches have intensity values`);

  // Show distribution
  const distribution = {
    noData: 0,
    small: 0,
    moderate: 0,
    big: 0
  };

  Object.values(result).forEach(intensity => {
    if (intensity === 0) distribution.noData++;
    else if (intensity < 3) distribution.small++;
    else if (intensity < 6) distribution.moderate++;
    else distribution.big++;
  });

  console.log('Distribution:');
  console.log(`  No data (0 ft): ${distribution.noData}`);
  console.log(`  Small (< 3 ft): ${distribution.small}`);
  console.log(`  Moderate (3-6 ft): ${distribution.moderate}`);
  console.log(`  Big (>= 6 ft): ${distribution.big}`);

  // Sample values
  const samples = Object.entries(result).slice(0, 10);
  console.log('\nSample beach intensity values:');
  samples.forEach(([beachId, intensity]) => {
    console.log(`  Beach ${beachId}: ${intensity.toFixed(2)} ft`);
  });

  // Check what the /api/beaches endpoint returns
  console.log('\n--- Checking /api/beaches endpoint ---');
  try {
    const beachesResponse = await fetch('http://localhost:3000/api/beaches');
    const beachesJson = await beachesResponse.json();
    if (beachesJson.success && beachesJson.data) {
      const apiBeaches = beachesJson.data;
      console.log(`API returned ${apiBeaches.length} beaches`);
      if (apiBeaches.length > 0) {
        console.log('Sample API beach:', apiBeaches[0]);
        console.log(`API beach ID type: ${typeof apiBeaches[0].id}`);

        // Check if any of these beach IDs exist in our intensity map
        const firstFiveIds = apiBeaches.slice(0, 5).map(b => b.id);
        console.log('\nChecking if first 5 API beach IDs are in intensity map:');
        firstFiveIds.forEach(id => {
          const hasIntensity = result.hasOwnProperty(id);
          const intensityValue = result[id];
          console.log(`  Beach ${id}: ${hasIntensity ? `${intensityValue} ft` : 'NOT FOUND'}`);
        });
      }
    }
  } catch (e) {
    console.log('Could not fetch from API (is dev server running?):', e.message);
  }
}

testSurfIntensity().catch(console.error);
