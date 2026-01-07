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
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // Create client with service role key to perform admin actions
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Authenticate the requester
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get the user from the auth header
        const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !requester) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify the requester is an admin or super_admin
        const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('is_admin', {
            p_user_id: requester.id
        });

        if (adminError || !isAdmin) {
            return new Response(
                JSON.stringify({ error: "Unauthorized. Admin access required." }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        const { userId, newPassword } = await req.json();

        if (!userId || !newPassword) {
            return new Response(
                JSON.stringify({ error: "Missing userId or newPassword" }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Update the user's password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (updateError) {
            console.error("Error updating password:", updateError);
            return new Response(
                JSON.stringify({ error: updateError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Admin ${requester.id} reset password for user ${userId}`);

        return new Response(
            JSON.stringify({ success: true, message: "Password reset successfully" }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error("Error in admin-reset-password:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
