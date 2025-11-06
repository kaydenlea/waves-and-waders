// Apply migration to add grid_id to beaches_optimized view
// Run with: node apply_migration.js

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in environment');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMigration() {
  console.log('📦 Applying migration: 003_add_grid_id_to_beaches_optimized.sql\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '003_add_grid_id_to_beaches_optimized.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing SQL...');

    // Execute the migration using Supabase RPC
    // Note: This requires the SQL to be executed via the Supabase dashboard or CLI
    // since the JS client doesn't support arbitrary SQL execution

    console.log('\n⚠️  This script cannot directly execute SQL migrations.');
    console.log('Please run this migration manually:\n');
    console.log('Option 1: Supabase Dashboard');
    console.log('  1. Go to https://app.supabase.com');
    console.log('  2. Select your project');
    console.log('  3. Navigate to SQL Editor');
    console.log('  4. Paste the contents of migrations/003_add_grid_id_to_beaches_optimized.sql');
    console.log('  5. Click "Run"\n');

    console.log('Option 2: Supabase CLI');
    console.log('  supabase db push\n');

    console.log('Or simply copy and execute this SQL:\n');
    console.log('---BEGIN SQL---');
    console.log(sql);
    console.log('---END SQL---\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
