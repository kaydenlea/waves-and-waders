// Complete debugging of the surf intensity data flow
// Run with: node debug_full_flow.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugFullFlow() {
  const today = new Date().toISOString().split('T')[0];
  console.log('='.repeat(60));
  console.log('COMPLETE SURF INTENSITY DATA FLOW DEBUG');
  console.log('='.repeat(60));
  console.log(`Date: ${today}\n`);

  // STEP 1: Check if view has grid_id
  console.log('STEP 1: Verify beaches_optimized view has grid_id column');
  console.log('-'.repeat(60));
  try {
    const { data: viewTest, error: viewError } = await supabase
      .from('beaches_optimized')
      .select('id, Name, grid_id')
      .limit(3);

    if (viewError) {
      console.error('❌ FAILED - Error querying beaches_optimized:', viewError.message);
      console.log('\n⚠️  The view does not have grid_id column yet!');
      console.log('   Make sure you ran the migration successfully.\n');
      return;
    }

    console.log('✅ SUCCESS - beaches_optimized has grid_id column');
    console.log('Sample beaches:');
    viewTest.forEach(b => {
      console.log(`   ${b.Name}: grid_id = ${b.grid_id || 'null'}`);
    });

    const withGridId = viewTest.filter(b => b.grid_id !== null).length;
    console.log(`   Beaches with grid_id: ${withGridId} / ${viewTest.length}`);
  } catch (e) {
    console.error('❌ FAILED -', e.message);
    return;
  }

  // STEP 2: Check daily_grid_surf_intensity table
  console.log('\n\nSTEP 2: Check daily_grid_surf_intensity table has data');
  console.log('-'.repeat(60));
  const { data: intensityData, error: intensityError } = await supabase
    .from('daily_grid_surf_intensity')
    .select('grid_id, date, avg_surf_max_ft')
    .eq('date', today);

  if (intensityError) {
    console.error('❌ FAILED -', intensityError.message);
    return;
  }

  if (!intensityData || intensityData.length === 0) {
    console.log('❌ FAILED - No intensity data for today');
    console.log(`   Table is empty for ${today}`);
    console.log('   Run your Python script to populate the data.\n');
    return;
  }

  console.log(`✅ SUCCESS - Found ${intensityData.length} grid intensity records`);
  console.log('Sample grid intensities:');
  intensityData.slice(0, 5).forEach(g => {
    console.log(`   Grid ${g.grid_id}: ${g.avg_surf_max_ft} ft`);
  });

  // STEP 3: Check beach-to-grid mapping
  console.log('\n\nSTEP 3: Check beach → grid_id mapping');
  console.log('-'.repeat(60));
  const { data: allBeaches, error: beachError } = await supabase
    .from('beaches_optimized')
    .select('id, Name, grid_id')
    .not('grid_id', 'is', null);

  if (beachError) {
    console.error('❌ FAILED -', beachError.message);
    return;
  }

  console.log(`✅ SUCCESS - Found ${allBeaches.length} beaches with grid_id`);

  // Build mapping
  const gridToBeaches = new Map();
  for (const beach of allBeaches) {
    if (!gridToBeaches.has(beach.grid_id)) {
      gridToBeaches.set(beach.grid_id, []);
    }
    gridToBeaches.get(beach.grid_id).push(beach);
  }

  console.log(`   Mapped to ${gridToBeaches.size} unique grid points`);

  // STEP 4: Simulate API mapping
  console.log('\n\nSTEP 4: Simulate /api/surf-intensity mapping');
  console.log('-'.repeat(60));

  const beachIntensityMap = {};
  let mappedCount = 0;

  for (const intensity of intensityData) {
    const beaches = gridToBeaches.get(intensity.grid_id);
    if (beaches) {
      for (const beach of beaches) {
        beachIntensityMap[beach.id] = Number(intensity.avg_surf_max_ft);
        mappedCount++;
      }
    }
  }

  console.log(`✅ SUCCESS - Mapped intensity to ${mappedCount} beaches`);

  // Show distribution
  const distribution = {
    noData: 0,
    small: 0,
    moderate: 0,
    big: 0
  };

  Object.values(beachIntensityMap).forEach(intensity => {
    if (intensity === 0) distribution.noData++;
    else if (intensity < 3) distribution.small++;
    else if (intensity < 6) distribution.moderate++;
    else distribution.big++;
  });

  console.log('\nIntensity distribution:');
  console.log(`   Gray (no data):     ${distribution.noData} beaches`);
  console.log(`   Green (< 3 ft):     ${distribution.small} beaches`);
  console.log(`   Orange (3-6 ft):    ${distribution.moderate} beaches`);
  console.log(`   Red (>= 6 ft):      ${distribution.big} beaches`);

  // STEP 5: Test actual API endpoint
  console.log('\n\nSTEP 5: Test actual /api/surf-intensity endpoint');
  console.log('-'.repeat(60));
  try {
    const response = await fetch(`http://localhost:3000/api/surf-intensity?date=${today}`);

    if (!response.ok) {
      console.log('❌ FAILED - API returned error:', response.status);
      console.log('   Is your dev server running? (npm run dev)');
      return;
    }

    const json = await response.json();

    if (!json.success) {
      console.log('❌ FAILED - API returned success=false');
      console.log('   Response:', json);
      return;
    }

    console.log('✅ SUCCESS - API returned data');
    console.log(`   Source: ${json.source}`);
    console.log(`   Beaches with intensity: ${Object.keys(json.data).length}`);

    // Sample values
    const samples = Object.entries(json.data).slice(0, 5);
    console.log('\n   Sample values from API:');
    samples.forEach(([beachId, intensity]) => {
      console.log(`      Beach ${beachId}: ${intensity} ft`);
    });

  } catch (e) {
    console.log('❌ FAILED - Could not reach API');
    console.log(`   Error: ${e.message}`);
    console.log('   Make sure dev server is running: npm run dev\n');
    return;
  }

  // STEP 6: Test /api/beaches endpoint
  console.log('\n\nSTEP 6: Test /api/beaches endpoint includes grid_id');
  console.log('-'.repeat(60));
  try {
    const response = await fetch('http://localhost:3000/api/beaches');

    if (!response.ok) {
      console.log('❌ FAILED - API returned error:', response.status);
      return;
    }

    const json = await response.json();

    if (!json.success || !json.data || json.data.length === 0) {
      console.log('❌ FAILED - No beach data returned');
      return;
    }

    console.log('✅ SUCCESS - /api/beaches returned', json.data.length, 'beaches');

    const sampleBeach = json.data[0];
    console.log('\n   Sample beach:');
    console.log(`      ID: ${sampleBeach.id}`);
    console.log(`      Name: ${sampleBeach.name}`);
    console.log(`      grid_id: ${sampleBeach.grid_id || 'MISSING!'}`);

    const beachesWithGridId = json.data.filter(b => b.grid_id != null).length;
    console.log(`\n   Beaches with grid_id: ${beachesWithGridId} / ${json.data.length}`);

    if (beachesWithGridId === 0) {
      console.log('\n   ⚠️  WARNING: No beaches have grid_id!');
      console.log('   This means the API is not returning grid_id.');
      console.log('   Check that you restarted your dev server after code changes.\n');
    }

  } catch (e) {
    console.log('❌ FAILED - Could not reach API');
    console.log(`   Error: ${e.message}\n`);
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('DEBUGGING COMPLETE');
  console.log('='.repeat(60));
  console.log('\nIf all steps passed, check your browser console for:');
  console.log('  1. "Loaded surf intensity from daily_grid_table"');
  console.log('  2. "Number of beaches with intensity: <number>"');
  console.log('  3. "Surf intensity distribution: { noData: X, small: Y, ... }"');
  console.log('\nIf the map still shows all gray, open DevTools and share the console output.\n');
}

debugFullFlow().catch(console.error);
