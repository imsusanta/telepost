import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function requiredViteEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and add the Supabase publishable URL and key.`,
    );
  }
  return value.trim();
}

const SUPABASE_URL = requiredViteEnv("VITE_SUPABASE_URL");
const SUPABASE_PUBLISHABLE_KEY = requiredViteEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
