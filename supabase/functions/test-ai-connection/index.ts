import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Verify user is super admin
    const token = authHeader.replace("Bearer ", "").trim();
    const payloadBase64 = token.split(".")[1];
    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = atob(normalized);
    const payload = JSON.parse(payloadJson);
    const userId = payload.sub;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { p_user_id: userId });
    
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { model, temperature } = await req.json();

    if (!model) {
      return new Response(
        JSON.stringify({ error: "Model is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not configured. Please add it in secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Testing AI connection with model: ${model}, temperature: ${temperature}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
        "X-Title": "QuizMaker AI Test",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: "Say 'Hello! AI connection successful.' in 10 words or less." }
        ],
        temperature: temperature || 0.7,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter error (${response.status}):`, errorText);
      
      let errorMessage = "Failed to connect to OpenRouter";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `OpenRouter API error: ${errorMessage}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log("AI test successful:", content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: content,
        model: data.model 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Test AI connection error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
