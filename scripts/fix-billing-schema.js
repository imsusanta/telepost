#!/usr/bin/env node

/**
 * Fix Billing Schema Script
 *
 * This script applies the billing schema fix migration to your Supabase instance.
 * It fixes the subscription_plans table to match the expected schema in the code.
 *
 * Usage:
 *   node scripts/fix-billing-schema.js
 *
 * Or with service role key:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key_here node scripts/fix-billing-schema.js
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
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_key_here node scripts/fix-billing-schema.js');
  console.error('\n--- OR ---\n');
  console.error('Run the SQL manually in Supabase Dashboard:');
  console.error('1. Go to: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/sql/new');
  console.error('2. Copy the contents of: supabase/migrations/20251119030000_fix_billing_schema.sql');
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

async function checkColumn(tableName, columnName) {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tableName}'
        AND column_name = '${columnName}';
    `
  });

  return !error && data && data.length > 0;
}

async function checkSchema() {
  console.log('🔍 Checking current schema...\n');

  try {
    // Check if subscription_plans table exists and has the old schema
    const hasOldPrice = await checkColumn('subscription_plans', 'price_monthly');
    const hasNewPrice = await checkColumn('subscription_plans', 'price');

    if (hasOldPrice) {
      console.log('❌ Found old schema: subscription_plans has price_monthly column');
      console.log('   Migration is needed!\n');
      return false;
    } else if (hasNewPrice) {
      console.log('✅ Schema is correct: subscription_plans has price column');
      console.log('   No migration needed!\n');
      return true;
    } else {
      console.log('⚠️  subscription_plans table may not exist or has unexpected schema');
      console.log('   Running migration anyway...\n');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Unable to check schema automatically, will apply migration...\n');
    return false;
  }
}

async function applyMigration() {
  console.log('📝 Applying billing schema fix migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251119030000_fix_billing_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (statement.includes('COMMENT ON')) {
        // Comments are executed separately
        continue;
      }

      try {
        await supabase.rpc('exec_sql', { sql: statement + ';' });
        successCount++;
      } catch (error) {
        // Some errors are OK (like "already exists")
        if (!error.message.includes('already exists')) {
          console.error(`⚠️  Warning: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n✅ Migration applied successfully!`);
    console.log(`   Executed ${successCount} statements`);
    if (errorCount > 0) {
      console.log(`   ${errorCount} warnings (may be normal)`);
    }
  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    console.error('\nPlease apply the migration manually:');
    console.error('1. Go to: https://supabase.com/dashboard/project/cazrdevenbxdjussycfj/sql/new');
    console.error('2. Copy the contents of: supabase/migrations/20251119030000_fix_billing_schema.sql');
    console.error('3. Paste and run in the SQL Editor');
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...\n');

  try {
    // Check if the new schema is in place
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Verification failed:', error.message);
      return false;
    }

    console.log('✅ Verification successful!');
    console.log(`   Found ${data?.length || 0} subscription plans`);

    if (data && data.length > 0) {
      const plan = data[0];
      console.log(`   Sample plan: ${plan.name} - $${plan.price}/${plan.billing_period}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Billing Schema Fix Script\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...\n`);

  try {
    const schemaCorrect = await checkSchema();

    if (!schemaCorrect) {
      await applyMigration();
      await verifyMigration();
    }

    console.log('\n✨ All done! Your billing schema is now fixed.');
    console.log('\n📝 Next steps:');
    console.log('1. Regenerate TypeScript types (if using Supabase CLI):');
    console.log('   supabase gen types typescript --project-id cazrdevenbxdjussycfj > src/integrations/supabase/types.ts');
    console.log('2. Test your billing page to ensure it loads correctly');
  } catch (error) {
    console.error('\n❌ Failed to fix billing schema');
    process.exit(1);
  }
}

main();
