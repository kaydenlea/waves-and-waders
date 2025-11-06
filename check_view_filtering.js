// Check what beaches are being filtered out by the beaches_optimized view
// Run with: node check_view_filtering.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkViewFiltering() {
  console.log('='.repeat(60));
  console.log('CHECKING BEACHES_OPTIMIZED VIEW FILTERING');
  console.log('='.repeat(60));
  console.log();

  // 1. Count total beaches in base table
  const { count: totalCount, error: totalError } = await supabase
    .from('beaches')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('Error counting beaches:', totalError);
    return;
  }

  console.log(`Total beaches in 'beaches' table: ${totalCount}`);

  // 2. Count beaches in optimized view
  const { count: viewCount, error: viewError } = await supabase
    .from('beaches_optimized')
    .select('*', { count: 'exact', head: true });

  if (viewError) {
    console.error('Error counting beaches_optimized:', viewError);
    return;
  }

  console.log(`Total beaches in 'beaches_optimized' view: ${viewCount}`);
  console.log(`Filtered out: ${totalCount - viewCount} beaches`);
  console.log();

  // 3. Check for beaches with NULL coordinates
  const { data: noCoords, error: noCoordsError } = await supabase
    .from('beaches')
    .select('id, Name, LATITUDE, LONGITUDE')
    .or('LATITUDE.is.null,LONGITUDE.is.null');

  if (noCoordsError) {
    console.error('Error:', noCoordsError);
  } else {
    console.log(`Beaches with NULL coordinates: ${noCoords?.length || 0}`);
    if (noCoords && noCoords.length > 0) {
      console.log('Sample beaches without coordinates:');
      noCoords.slice(0, 5).forEach(b => {
        console.log(`  - ${b.Name}: lat=${b.LATITUDE}, lng=${b.LONGITUDE}`);
      });
    }
  }
  console.log();

  // 4. Check for inland areas
  const { data: inlandAreas, error: inlandError } = await supabase
    .from('beaches')
    .select('id, Name, INLND_AREA')
    .eq('INLND_AREA', 'Yes');

  if (inlandError) {
    console.error('Error:', inlandError);
  } else {
    console.log(`Beaches marked as INLND_AREA = 'Yes': ${inlandAreas?.length || 0}`);
    if (inlandAreas && inlandAreas.length > 0) {
      console.log('Sample inland areas:');
      inlandAreas.slice(0, 5).forEach(b => {
        console.log(`  - ${b.Name}`);
      });
    }
  }
  console.log();

  // 5. Get beaches that are in beaches but NOT in beaches_optimized
  const { data: allBeaches } = await supabase
    .from('beaches')
    .select('id, Name, LATITUDE, LONGITUDE, INLND_AREA');

  const { data: optimizedBeaches } = await supabase
    .from('beaches_optimized')
    .select('id');

  if (allBeaches && optimizedBeaches) {
    const optimizedIds = new Set(optimizedBeaches.map(b => b.id));
    const filteredOut = allBeaches.filter(b => !optimizedIds.has(b.id));

    console.log(`Beaches filtered out by view: ${filteredOut.length}`);

    if (filteredOut.length > 0) {
      console.log('\nReasons for filtering:');

      const noLat = filteredOut.filter(b => b.LATITUDE === null || b.LATITUDE === undefined);
      const noLng = filteredOut.filter(b => b.LONGITUDE === null || b.LONGITUDE === undefined);
      const inland = filteredOut.filter(b => b.INLND_AREA === 'Yes' || b.INLND_AREA === 'Y' || b.INLND_AREA === true);

      console.log(`  - Missing LATITUDE: ${noLat.length}`);
      console.log(`  - Missing LONGITUDE: ${noLng.length}`);
      console.log(`  - Marked as INLND_AREA: ${inland.length}`);

      console.log('\nSample filtered beaches:');
      filteredOut.slice(0, 10).forEach(b => {
        const reasons = [];
        if (!b.LATITUDE) reasons.push('no lat');
        if (!b.LONGITUDE) reasons.push('no lng');
        if (b.INLND_AREA === 'Yes' || b.INLND_AREA === 'Y' || b.INLND_AREA === true) reasons.push('inland');
        console.log(`  - ${b.Name}: ${reasons.join(', ')}`);
      });
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${totalCount} beaches`);
  console.log(`View: ${viewCount} beaches`);
  console.log(`Filtered: ${totalCount - viewCount} beaches (${((totalCount - viewCount) / totalCount * 100).toFixed(1)}%)`);
}

checkViewFiltering().catch(console.error);
