# Beach Map Screenshot Generator

This script automatically generates map screenshots for each beach in your database.

## What it does

1. Fetches all beaches from your Supabase `beaches` table
2. Opens a MapLibre GL map (same style as your website) **without labels**
3. Centers the map on each beach's coordinates
4. Adds a red marker at the beach location
5. Takes a screenshot and saves it to `public/beaches/maps/{beach_id}.png`

## Installation

Install required dependencies:

```bash
cd E:\Code\surf_website\waves-and-waders
npm install
```

This will install:
- `puppeteer` - Headless browser for taking screenshots
- `dotenv` - For loading environment variables

## Usage

### Test with 5 beaches first (recommended):

```bash
npm run generate-beach-maps:test
```

### Generate for all beaches:

```bash
npm run generate-beach-maps
```

### Custom options:

```bash
# Limit to specific number of beaches
node scripts/generate-beach-map-screenshots.js --limit 10

# Custom zoom level (default: 15)
node scripts/generate-beach-map-screenshots.js --zoom 14

# Custom image size (default: 600x400)
node scripts/generate-beach-map-screenshots.js --size 800x600

# Combine options
node scripts/generate-beach-map-screenshots.js --limit 20 --zoom 16 --size 500x500
```

## Output

Screenshots are saved to:
```
E:\Code\surf_website\waves-and-waders\public\beaches\maps\
├── 1.png
├── 2.png
├── 3.png
└── ...
```

Each file is named with the beach's ID from the database.

## Features

- **No labels map**: Uses CartoDB Voyager No Labels style for cleaner screenshots
- **Red marker**: Shows exact beach location
- **Skip existing**: Won't regenerate screenshots that already exist
- **Progress tracking**: Shows which beaches are being processed
- **Error handling**: Skips beaches with missing coordinates
- **Summary report**: Shows success/failure count at the end

## Configuration

Edit the script constants at the top if needed:

```javascript
const MAP_WIDTH = 600;        // Screenshot width
const MAP_HEIGHT = 400;       // Screenshot height
const ZOOM_LEVEL = 15;        // Map zoom (14-16 recommended)
const WAIT_TIME = 3000;       // Time to wait for map tiles (ms)
```

## Map Style

The script uses CartoDB's Voyager No Labels style:
```
https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json
```

This matches your website's map style but removes all text labels for cleaner previews.

## Troubleshooting

**"Missing Supabase credentials"**: Make sure `.env.local` exists with valid credentials

**Screenshots are blank**: Increase `WAIT_TIME` to give tiles more time to load

**Browser fails to launch**: Try running with `--no-sandbox`:
```bash
node scripts/generate-beach-map-screenshots.js
```

**Out of memory**: Process beaches in batches:
```bash
node scripts/generate-beach-map-screenshots.js --limit 50
# Then delete processed ones and run again
```

## Next Steps

After generating screenshots, you can:

1. **Use locally**: Access via `/beaches/maps/{beach_id}.png` in your app
2. **Upload to Supabase Storage**: Use the companion upload script (if created)
3. **Optimize images**: Run through an image optimizer to reduce file sizes
4. **Add to database**: Store URLs in a new `map_preview_url` column

## Performance

- **Speed**: ~5-10 seconds per beach (including map load time)
- **Size**: ~100-200 KB per screenshot (PNG format)
- **Total time**: ~10-20 minutes for 100 beaches

## Example Output

```
🚀 Starting beach map screenshot generation...

Configuration:
  - Output: E:\Code\surf_website\waves-and-waders\public\beaches\maps
  - Size: 600x400
  - Zoom: 15
  - Limit: All beaches
  - Wait time: 3000ms

📡 Fetching beaches from Supabase...
✓ Found 127 beaches

🌐 Launching browser...
✓ [1/127] Venice Beach (Los Angeles) - Saved to 1.png
✓ [2/127] Manhattan Beach (Los Angeles) - Saved to 2.png
✓ [3/127] Santa Monica Beach (Los Angeles) - Saved to 3.png
...

============================================================
📊 Summary:
   Total beaches: 127
   ✓ Successful: 125
   ❌ Failed: 2
============================================================

✅ Screenshots saved to: E:\Code\surf_website\waves-and-waders\public\beaches\maps
```
