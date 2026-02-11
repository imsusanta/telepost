#!/usr/bin/env node

/**
 * Create Custom Invitation Code Script
 *
 * This script creates a custom invitation code in the database.
 *
 * Usage:
 *   node scripts/create-invitation-code.js <code> [maxUses] [expiresInDays]
 *
 * Examples:
 *   node scripts/create-invitation-code.js telbot
 *   node scripts/create-invitation-code.js telbot 100
 *   node scripts/create-invitation-code.js telbot 100 90
 *
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable must be set
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Parse command line arguments
const args = process.argv.slice(2);
const customCode = args[0];
const maxUses = args[1] ? parseInt(args[1]) : 1;
const expiresInDays = args[2] ? parseInt(args[2]) : null;

if (!customCode) {
  console.error('❌ Error: Please provide an invitation code.');
  console.error('\nUsage:');
  console.error('  node scripts/create-invitation-code.js <code> [maxUses] [expiresInDays]');
  console.error('\nExamples:');
  console.error('  node scripts/create-invitation-code.js telbot');
  console.error('  node scripts/create-invitation-code.js telbot 100');
  console.error('  node scripts/create-invitation-code.js telbot 100 90');
  process.exit(1);
}

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wpkxbrdgktmwnowvmwue.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.');
  console.error('\nTo fix this:');
  console.error('1. Go to your Supabase Dashboard');
  console.error('2. Copy the "service_role" key (NOT the anon/public key)');
  console.error('3. Run this script with the key:');
  console.error(`   SUPABASE_SERVICE_ROLE_KEY=your_key_here node scripts/create-invitation-code.js ${customCode}`);
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createCustomInvitationCode() {
  try {
    console.log('🔍 Creating custom invitation code...');
    console.log(`   Code: ${customCode}`);
    console.log(`   Max Uses: ${maxUses}`);
    console.log(`   Expires In: ${expiresInDays ? `${expiresInDays} days` : 'Never'}`);
    console.log('');

    // Get the first super admin user
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1);

    if (profileError) {
      throw new Error(`Failed to fetch super admin: ${profileError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      throw new Error('No super admin user found. Please create a super admin user first.');
    }

    const createdBy = profiles[0].id;

    // Create the custom invitation code using direct insert
    const { data, error } = await supabase
      .from('invitation_codes')
      .insert({
        code: customCode.toUpperCase(),
        created_by: createdBy,
        max_uses: maxUses,
        expires_at: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null,
        is_active: true,
        metadata: {
          created_via: 'script',
          custom_code: true
        }
      })
      .select('id, code, max_uses, expires_at, is_active')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`Invitation code "${customCode}" already exists!`);
      }
      throw new Error(`Failed to create invitation code: ${error.message}`);
    }

    console.log('✅ Custom invitation code created successfully!');
    console.log('');
    console.log('📋 Code Details:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Code: ${data.code}`);
    console.log(`   Max Uses: ${data.max_uses}`);
    console.log(`   Expires At: ${data.expires_at || 'Never'}`);
    console.log(`   Is Active: ${data.is_active}`);
    console.log('');
    console.log('🎉 Users can now sign up using this invitation code!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
createCustomInvitationCode();
