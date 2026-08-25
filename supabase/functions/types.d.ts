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
declare module "https://deno.land/std*" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
  export function createHmac(algorithm: string, key: any): any;
}

declare module "https://esm.sh/@supabase/supabase-js*" {
  export { createClient, SupabaseClient } from "@supabase/supabase-js";
}

declare module "npm:@supabase/supabase-js*" {
  export { createClient, SupabaseClient } from "@supabase/supabase-js";
}

declare module "https://esm.sh/unpdf*" {
  export function extractText(data: any): Promise<any>;
  export function getDocumentProxy(data: any): Promise<any>;
}
