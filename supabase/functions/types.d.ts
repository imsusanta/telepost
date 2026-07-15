// Type declarations for Supabase Edge Functions (Deno runtime)
// This file helps the IDE resolve Deno-specific modules and globals.

// Deno namespace
declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
    toObject(): { [key: string]: string };
  }
  const env: Env;
}

// Module declarations for Deno imports
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.0" {
  export { createClient, SupabaseClient } from "@supabase/supabase-js";
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export { createClient, SupabaseClient } from "@supabase/supabase-js";
}
