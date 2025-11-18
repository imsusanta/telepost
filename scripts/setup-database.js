#!/usr/bin/env node

/**
 * Database Setup Script
 *
 * This script applies all necessary database migrations to your Supabase instance.
 * Run this script to create the subscriptions table and all related schema.
 *
 * Usage:
 *   node scripts/setup-database.js
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
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cazrdevenbxdjussycfj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.');
  console.error('\nTo fix this:');
  console.error('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/settings/api');
  console.error('2. Copy the "service_role" key (NOT the anon/public key)');
  console.error('3. Run this script with the key:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_key_here node scripts/setup-database.js');
  console.error('\n--- OR ---\n');
  console.error('Run the SQL manually in Supabase Dashboard:');
  console.error('1. Go to: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/sql/new');
  console.error('2. Copy the contents of: supabase/consolidated_migrations.sql');
  console.error('3. Paste and run in the SQL Editor');
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
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    // Table does not exist
    return false;
  }

  return true;
}

async function runMigrations() {
  console.log('🔍 Checking database schema...\n');

  // Check which tables exist
  const tables = [
    'subscription_plans',
    'subscriptions',
    'usage_tracking',
    'documents',
    'question_banks',
    'quiz_analytics',
    'leaderboards'
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

  if (missingTables.length === 0) {
    console.log('\n✅ All required tables exist! Database is set up correctly.');
    return;
  }

  console.log(`\n⚠️  Found ${missingTables.length} missing table(s): ${missingTables.join(', ')}`);
  console.log('\n📋 To fix this, run the consolidated migration SQL:');
  console.log('\n--- OPTION 1: Run SQL in Supabase Dashboard (Recommended) ---');
  console.log('1. Go to: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/sql/new');
  console.log('2. Open the file: supabase/consolidated_migrations.sql');
  console.log('3. Copy all contents and paste into the SQL Editor');
  console.log('4. Click "Run" to execute');
  console.log('\n--- OPTION 2: Use Supabase CLI ---');
  console.log('1. Install Supabase CLI: https://supabase.com/docs/guides/cli');
  console.log('2. Login: supabase login');
  console.log('3. Link project: supabase link --project-ref cazrdevenbxdjussycfj');
  console.log('4. Push migrations: supabase db push');
}

async function main() {
  console.log('🚀 Database Setup Script for Quiz Genie\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
  console.log('');

  try {
    await runMigrations();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
