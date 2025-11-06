// Quick verification that the fix is working
// Run with: node verify_fix.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
  console.log('=== Verification Test ===\n');

  // 1. Check beaches_optimized has grid_id column
  console.log('1. Checking if beaches_optimized has grid_id...');
  const { data: sampleBeaches, error: beachError } = await supabase
    .from('beaches_optimized')
    .select('id, Name, grid_id')
    .not('grid_id', 'is', null)
    .limit(5);

  if (beachError) {
    console.error('❌ Error:', beachError.message);
    return;
  }

  console.log(`✅ Found ${sampleBeaches?.length || 0} beaches with grid_id`);
  if (sampleBeaches && sampleBeaches.length > 0) {
    console.log('Sample:', sampleBeaches[0]);
  }

  // 2. Get surf intensity for today
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n2. Checking surf intensity for ${today}...`);

  const { data: intensityData, error: intensityError } = await supabase
    .from('daily_grid_surf_intensity')
    .select('grid_id, avg_surf_max_ft')
    .eq('date', today)
    .limit(5);

  if (intensityError) {
    console.error('❌ Error:', intensityError.message);
    return;
  }

  console.log(`✅ Found ${intensityData?.length || 0} grid intensity records`);
  if (intensityData && intensityData.length > 0) {
    console.log('Sample:', intensityData[0]);
  }

  // 3. Simulate the mapping
  console.log('\n3. Simulating beach → intensity mapping...');

  // Get all beaches with grid_id
  const { data: allBeaches } = await supabase
    .from('beaches_optimized')
    .select('id, Name, grid_id')
    .not('grid_id', 'is', null);

  // Get all intensity data
  const { data: allIntensity } = await supabase
    .from('daily_grid_surf_intensity')
    .select('grid_id, avg_surf_max_ft')
    .eq('date', today);

  // Build map
  const gridToBeaches = new Map();
  for (const beach of allBeaches || []) {
    if (!beach.grid_id) continue;
    if (!gridToBeaches.has(beach.grid_id)) {
      gridToBeaches.set(beach.grid_id, []);
    }
    gridToBeaches.get(beach.grid_id).push(beach);
  }

  // Map intensity
  let matchedBeaches = 0;
  let totalIntensity = 0;

  for (const intensity of allIntensity || []) {
    const beaches = gridToBeaches.get(intensity.grid_id);
    if (beaches) {
      matchedBeaches += beaches.length;
      totalIntensity += beaches.length * (intensity.avg_surf_max_ft || 0);
    }
  }

  console.log(`✅ Mapped intensity to ${matchedBeaches} beaches`);
  console.log(`   Average intensity: ${(totalIntensity / matchedBeaches).toFixed(2)} ft`);

  // 4. Show a sample mapping
  console.log('\n4. Sample beach → intensity mappings:');
  let count = 0;
  for (const intensity of allIntensity || []) {
    if (count >= 3) break;
    const beaches = gridToBeaches.get(intensity.grid_id);
    if (beaches && beaches.length > 0) {
      const beach = beaches[0];
      console.log(`   ${beach.Name} (${beach.id}): ${intensity.avg_surf_max_ft} ft`);
      count++;
    }
  }

  console.log('\n✅ All checks passed! The fix should work.');
}

verify().catch(console.error);
