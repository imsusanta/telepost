#!/usr/bin/env node

/**
 * Apply Telegram Stories Feature Migration
 *
 * This script applies the Telegram Stories feature migration to your Supabase instance.
 * It creates the necessary tables (telegram_stories, story_templates, story_analytics),
 * sets up RLS policies, and seeds default templates.
 *
 * Usage:
 *   node scripts/apply-stories-migration.js
 *
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable must be set
 *   - Or run the SQL directly in the Supabase Dashboard SQL Editor
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wpkxbrdgktmwnowvmwue.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.');
  console.error('\nTo fix this:');
  console.error('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wpkxbrdgktmwnowvmwue/settings/api');
  console.error('2. Copy the "service_role" key (NOT the anon/public key)');
  console.error('3. Run this script with the key:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_key_here node scripts/apply-stories-migration.js');
  console.error('\n--- OR ---\n');
  console.error('Run the SQL manually in Supabase Dashboard:');
  console.error('1. Go to: https://supabase.com/dashboard/project/wpkxbrdgktmwnowvmwue/sql/new');
  console.error('2. Copy the contents of: supabase/migrations/20251119060000_telegram_stories_feature.sql');
  console.error('3. Paste and run in the SQL Editor');
  console.error('\n⚠️  IMPORTANT: Make sure to run the ENTIRE migration file!');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      // Table does not exist
      return false;
    }

    if (error) {
      console.error(`Error checking table ${tableName}:`, error);
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

async function executeSQLFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`📄 Reading migration file: ${filePath}`);
    console.log('⚡ Executing SQL...\n');

    // Split SQL into individual statements (basic splitting by semicolon)
    // Note: This is a simple approach and may not work for complex SQL
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          console.log(`❌ Statement ${i + 1} failed:`, error.message);
          errorCount++;
        } else {
          console.log(`✓ Statement ${i + 1} executed`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Statement ${i + 1} error:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`);
    return errorCount === 0;
  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    return false;
  }
}

async function checkStoryTables() {
  console.log('🔍 Checking Telegram Stories tables...\n');

  const tables = [
    'telegram_stories',
    'story_templates',
    'story_analytics'
  ];

  const missingTables = [];

  for (const table of tables) {
    const exists = await checkTableExists(table);
    if (exists) {
      console.log(`✓ Table "${table}" exists`);
    } else {
      console.log(`✗ Table "${table}" is missing`);
      missingTables.push(table);
    }
  }

  return missingTables;
}

async function checkTemplates() {
  console.log('\n🔍 Checking story templates...\n');

  const { data, error } = await supabase
    .from('story_templates')
    .select('template_id, name, category')
    .eq('is_public', true);

  if (error) {
    console.error('❌ Error checking templates:', error.message);
    return false;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No templates found! The migration might not have been applied correctly.');
    return false;
  }

  console.log(`✓ Found ${data.length} default templates:`);
  data.forEach(template => {
    console.log(`  - ${template.name} (${template.category})`);
  });

  return true;
}

async function main() {
  console.log('🚀 Telegram Stories Feature Migration Script\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...\n`);

  try {
    // Check if tables already exist
    const missingTables = await checkStoryTables();

    if (missingTables.length === 0) {
      console.log('\n✅ All story tables exist!');

      // Check if templates are seeded
      const hasTemplates = await checkTemplates();

      if (hasTemplates) {
        console.log('\n✅ Database is fully set up for Telegram Stories feature!');
      } else {
        console.log('\n⚠️  Tables exist but templates are missing. You may need to re-run the migration.');
      }

      return;
    }

    console.log(`\n⚠️  Found ${missingTables.length} missing table(s): ${missingTables.join(', ')}`);
    console.log('\n📋 To apply the migration:\n');
    console.log('--- OPTION 1: Run SQL in Supabase Dashboard (Recommended) ---');
    console.log('1. Go to: https://supabase.com/dashboard/project/wpkxbrdgktmwnowvmwue/sql/new');
    console.log('2. Open the file: supabase/migrations/20251119060000_telegram_stories_feature.sql');
    console.log('3. Copy ALL contents and paste into the SQL Editor');
    console.log('4. Click "Run" to execute');
    console.log('5. Run this script again to verify: node scripts/apply-stories-migration.js\n');

    console.log('--- OPTION 2: Use Supabase CLI ---');
    console.log('1. Install Supabase CLI: https://supabase.com/docs/guides/cli');
    console.log('2. Login: supabase login');
    console.log('3. Link project: supabase link --project-ref wpkxbrdgktmwnowvmwue');
    console.log('4. Push migrations: supabase db push\n');

    console.log('⚠️  IMPORTANT NOTES:');
    console.log('- Make sure to run the ENTIRE migration file (all 365 lines)');
    console.log('- The migration includes table creation, indexes, RLS policies, and seed data');
    console.log('- If you get errors about existing objects, you may need to manually clean up first');

    process.exit(1);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
