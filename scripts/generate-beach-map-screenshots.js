#!/usr/bin/env node
/**
 * Generate map screenshots for each beach
 *
 * This script:
 * 1. Fetches all beaches from Supabase
 * 2. Opens a MapLibre GL map (same as the website) without labels
 * 3. Centers on each beach's coordinates
 * 4. Takes a screenshot and saves it
 *
 * Usage:
 *   node scripts/generate-beach-map-screenshots.js
 *   node scripts/generate-beach-map-screenshots.js --limit 5  (test with 5 beaches)
 *   node scripts/generate-beach-map-screenshots.js --zoom 14 --size 600x400
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../public/beaches/maps');
const MAP_WIDTH = 600;
const MAP_HEIGHT = 400;
const ZOOM_LEVEL = 15;
const WAIT_TIME = 3000; // ms to wait for map to load

// Parse command line args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
};

const LIMIT = getArg('--limit') ? parseInt(getArg('--limit')) : null;
const ZOOM = getArg('--zoom') ? parseInt(getArg('--zoom')) : ZOOM_LEVEL;
const SIZE = getArg('--size') || `${MAP_WIDTH}x${MAP_HEIGHT}`;
const [WIDTH, HEIGHT] = SIZE.split('x').map(Number);

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✓ Created directory: ${OUTPUT_DIR}`);
}

// HTML template with MapLibre GL map (no labels)
const getMapHTML = (lat, lng, zoom) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Beach Map</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = new maplibregl.Map({
      container: 'map',
      // Use the same map style as your website but with no labels
      style: 'https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json',
      center: [${lng}, ${lat}],
      zoom: ${zoom},
      interactive: false,
      attributionControl: false
    });

    // Add a marker at the beach location
    const el = document.createElement('div');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundColor = '#FF4444';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

    new maplibregl.Marker({ element: el })
      .setLngLat([${lng}, ${lat}])
      .addTo(map);

    // Signal that map is ready
    map.on('load', () => {
      document.body.setAttribute('data-map-loaded', 'true');
    });
  </script>
</body>
</html>
`;

async function generateScreenshots() {
  console.log('🚀 Starting beach map screenshot generation...\n');
  console.log(`Configuration:
  - Output: ${OUTPUT_DIR}
  - Size: ${WIDTH}x${HEIGHT}
  - Zoom: ${ZOOM}
  - Limit: ${LIMIT || 'All beaches'}
  - Wait time: ${WAIT_TIME}ms\n`);

  // Fetch beaches from Supabase
  console.log('📡 Fetching beaches from Supabase...');
  let query = supabase
    .from('beaches')
    .select('id, Name, LATITUDE, LONGITUDE, COUNTY')
    .order('Name');

  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data: beaches, error } = await query;

  if (error) {
    console.error('❌ Error fetching beaches:', error);
    process.exit(1);
  }

  if (!beaches || beaches.length === 0) {
    console.error('❌ No beaches found');
    process.exit(1);
  }

  console.log(`✓ Found ${beaches.length} beaches\n`);

  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  // Process each beach
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < beaches.length; i++) {
    const beach = beaches[i];
    const { id, Name, LATITUDE, LONGITUDE, COUNTY } = beach;

    // Skip beaches without coordinates
    if (!LATITUDE || !LONGITUDE) {
      console.log(`⚠️  [${i + 1}/${beaches.length}] Skipping ${Name} (missing coordinates)`);
      errorCount++;
      continue;
    }

    try {
      const outputPath = path.join(OUTPUT_DIR, `${id}.png`);

      // Check if screenshot already exists
      if (fs.existsSync(outputPath)) {
        console.log(`⏭️  [${i + 1}/${beaches.length}] ${Name} (${COUNTY}) - Already exists, skipping`);
        successCount++;
        continue;
      }

      // Generate HTML with map
      const html = getMapHTML(LATITUDE, LONGITUDE, ZOOM);

      // Load the page
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Wait for map to load
      await page.waitForFunction(
        () => document.body.getAttribute('data-map-loaded') === 'true',
        { timeout: 10000 }
      );

      // Additional wait to ensure tiles are rendered
      await page.waitForTimeout(WAIT_TIME);

      // Take screenshot
      await page.screenshot({
        path: outputPath,
        type: 'png'
      });

      successCount++;
      console.log(`✓ [${i + 1}/${beaches.length}] ${Name} (${COUNTY}) - Saved to ${id}.png`);

    } catch (err) {
      errorCount++;
      console.error(`❌ [${i + 1}/${beaches.length}] Failed for ${Name}:`, err.message);
    }
  }

  await browser.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Total beaches: ${beaches.length}`);
  console.log(`   ✓ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));
  console.log(`\n✅ Screenshots saved to: ${OUTPUT_DIR}`);
}

// Run the script
generateScreenshots().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
