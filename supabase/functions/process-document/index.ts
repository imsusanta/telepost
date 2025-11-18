import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - pdf-parse types
import pdfParse from "npm:pdf-parse@1.1.1";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    // Convert blob to buffer for pdf-parse
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Parse PDF to extract text
    let extractedText = "";
    let pageCount = 0;

    try {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
      pageCount = pdfData.numpages;

      // Clean up extracted text (remove excessive whitespace)
      extractedText = extractedText
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      if (!extractedText) {
        throw new Error("No text could be extracted from PDF");
      }
    } catch (parseError) {
      console.error("PDF parsing error:", parseError);
      throw new Error(`Failed to parse PDF: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
    }

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
