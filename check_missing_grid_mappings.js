// Check which beaches don't have grid_id or have mismatched grid_ids
// Run with: node check_missing_grid_mappings.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMissingGridMappings() {
  const today = new Date().toISOString().split('T')[0];

  console.log('='.repeat(60));
  console.log('CHECKING MISSING GRID MAPPINGS');
  console.log('='.repeat(60));
  console.log();

  // 1. Get all beaches from beaches_optimized
  const { data: allBeaches, error: beachError } = await supabase
    .from('beaches_optimized')
    .select('id, Name, grid_id');

  if (beachError) {
    console.error('Error fetching beaches:', beachError);
    return;
  }

  console.log(`Total beaches: ${allBeaches.length}`);

  // 2. Count beaches with/without grid_id
  const beachesWithGridId = allBeaches.filter(b => b.grid_id !== null);
  const beachesWithoutGridId = allBeaches.filter(b => b.grid_id === null);

  console.log(`  With grid_id: ${beachesWithGridId.length}`);
  console.log(`  Without grid_id (NULL): ${beachesWithoutGridId.length}`);

  if (beachesWithoutGridId.length > 0) {
    console.log('\nSample beaches WITHOUT grid_id:');
    beachesWithoutGridId.slice(0, 5).forEach(b => {
      console.log(`  - ${b.Name} (${b.id})`);
    });
  }

  // 3. Get all grid_ids that have intensity data
  const { data: intensityData, error: intensityError } = await supabase
    .from('daily_grid_surf_intensity')
    .select('grid_id')
    .eq('date', today);

  if (intensityError) {
    console.error('Error fetching intensity data:', intensityError);
    return;
  }

  const gridsWithIntensity = new Set(intensityData.map(d => d.grid_id));
  console.log(`\nGrids with intensity data: ${gridsWithIntensity.size}`);

  // 4. Check which beach grid_ids don't have intensity data
  const uniqueBeachGridIds = new Set(beachesWithGridId.map(b => b.grid_id));
  console.log(`Unique grid_ids in beaches: ${uniqueBeachGridIds.size}`);

  const missingGrids = [...uniqueBeachGridIds].filter(
    gridId => !gridsWithIntensity.has(gridId)
  );

  if (missingGrids.length > 0) {
    console.log(`\n⚠️  Found ${missingGrids.length} grid_ids that DON'T have intensity data:`);
    missingGrids.forEach(gridId => console.log(`  - Grid ${gridId}`));

    // Show which beaches use these missing grids
    console.log('\nBeaches using these missing grids:');
    for (const gridId of missingGrids.slice(0, 3)) {
      const beaches = beachesWithGridId.filter(b => b.grid_id === gridId);
      console.log(`  Grid ${gridId}: ${beaches.length} beaches`);
      beaches.slice(0, 3).forEach(b => {
        console.log(`    - ${b.Name}`);
      });
    }
  }

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const beachesWithMatchingGrid = beachesWithGridId.filter(b =>
    gridsWithIntensity.has(b.grid_id)
  );

  console.log(`Total beaches: ${allBeaches.length}`);
  console.log(`  ✅ With matching grid & intensity: ${beachesWithMatchingGrid.length}`);
  console.log(`  ⚠️  Without grid_id (NULL): ${beachesWithoutGridId.length}`);
  console.log(`  ⚠️  With grid_id but no intensity: ${beachesWithGridId.length - beachesWithMatchingGrid.length}`);
  console.log(`  = Gray dots on map: ${allBeaches.length - beachesWithMatchingGrid.length}`);
}

checkMissingGridMappings().catch(console.error);
