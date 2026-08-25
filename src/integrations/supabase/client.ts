// Supabase client for the TelePost production application.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wpkxbrdgktmwnowvmwue.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwa3hicmRna3Rtd25vd3Ztd3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTkyNTQsImV4cCI6MjA4MDY5NTI1NH0.TR7cBNS0w6REoI2cKgcc3pubgIrY94IWoiXAWiy3X3M';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
