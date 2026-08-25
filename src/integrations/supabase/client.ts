// Supabase client for the TelePost production application.
// Keep this client tied to the configured TelePost Supabase project.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wpkxbrdgktmwnowvmwue.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0ZWxlcG9zdCIsInJlZiI6Indwa3hicmRna3Rtd25vd3ZtdWue';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Production must always use browser-local session storage. Lovable preview
    // auth brokering is intentionally not part of the production auth path.
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
