import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated and is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
      p_user_id: user.id
    });

    if (adminError || !isAdmin) {
      console.error("Admin check error:", adminError);
      return new Response(
        JSON.stringify({ error: "Unauthorized. Admin access required." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { count = 1, maxUses = 1, expiresInDays = 30 } = await req.json();

    // Validate inputs
    if (count < 1 || count > 100) {
      return new Response(
        JSON.stringify({ error: "Count must be between 1 and 100" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (maxUses < 1) {
      return new Response(
        JSON.stringify({ error: "Max uses must be at least 1" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (expiresInDays < 1) {
      return new Response(
        JSON.stringify({ error: "Expiration days must be at least 1" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate invitation codes
    const codes = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    for (let i = 0; i < count; i++) {
      // Generate random code (12 characters)
      const code = generateCode(12);

      // Insert into database
      const { data: insertedCode, error: insertError } = await supabase
        .from('invitation_codes')
        .insert({
          code: code,
          created_by: user.id,
          max_uses: maxUses,
          current_uses: 0,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error inserting code ${i + 1}:`, insertError);
        throw new Error(`Failed to generate code ${i + 1}: ${insertError.message}`);
      }

      codes.push(insertedCode);
    }

    console.log(`Generated ${codes.length} invitation codes for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        codes: codes,
        message: `Successfully generated ${codes.length} invitation code${codes.length > 1 ? 's' : ''}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error in generate-invitation-codes:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate a random alphanumeric code
function generateCode(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
