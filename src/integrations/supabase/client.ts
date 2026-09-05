import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Vite only inlines *static* import.meta.env.VITE_* access into the production
// bundle. Dynamic lookup (import.meta.env[name]) leaves an empty env object and
// the app throws on boot — that blanked telepost.tech after the JWT fallback
// was removed.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (
  typeof SUPABASE_URL !== "string" ||
  SUPABASE_URL.trim() === "" ||
  typeof SUPABASE_PUBLISHABLE_KEY !== "string" ||
  SUPABASE_PUBLISHABLE_KEY.trim() === ""
) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set. Copy .env.example to .env.",
  );
}

export const supabase = createClient<Database>(SUPABASE_URL.trim(), SUPABASE_PUBLISHABLE_KEY.trim(), {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
