import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, storagePath, publicUrl } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing documentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // In a production environment, you would:
    // 1. Download the PDF from storage
    // 2. Use a PDF parsing library (like pdf-parse or pdfjs-dist)
    // 3. Extract text content
    // 4. Use AI to analyze and summarize

    // For now, we'll simulate the processing
    // In production, integrate with actual PDF parsing libraries

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Simulated extraction (replace with actual PDF parsing)
    const extractedText = "Sample extracted text from PDF. In production, this would be actual content.";
    const pageCount = 10;

    // Use AI to generate summary and topics
    let aiSummary = "";
    let topics: string[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a document analyzer. Provide a brief summary and list of topics.",
              },
              {
                role: "user",
                content: `Analyze this document and provide:\n1. A brief summary (2-3 sentences)\n2. A list of main topics (JSON array)\n\nDocument content:\n${extractedText.substring(0, 1000)}`,
              },
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";

          // Parse the response (simplified - would need better parsing in production)
          aiSummary = content.split('\n').slice(0, 3).join(' ');
          topics = ["General", "Document Analysis"]; // Simplified
        }
      } catch (error) {
        console.error("AI analysis failed:", error);
        aiSummary = "AI analysis unavailable";
        topics = ["General"];
      }
    }

    return new Response(
      JSON.stringify({
        extractedText,
        pageCount,
        aiSummary: aiSummary || "Document processed successfully",
        topics: topics.length > 0 ? topics : ["General"],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
