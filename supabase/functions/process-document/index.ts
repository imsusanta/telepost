import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdfParse from "pdf-parse";

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

    if (!fileData) {
      throw new Error("No file data received");
    }

    // Convert blob to buffer for pdf-parse
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Extract text from PDF
    let extractedText = "";
    let pageCount = 1;

    try {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
      pageCount = pdfData.numpages;

      // Clean up the extracted text
      extractedText = extractedText.trim();

      if (!extractedText || extractedText.length < 10) {
        throw new Error("No text could be extracted from the PDF. The PDF might be image-based or encrypted.");
      }

      console.log(`Extracted ${extractedText.length} characters from ${pageCount} pages`);
    } catch (error) {
      console.error("PDF parsing error:", error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Use AI to generate summary and topics
    let aiSummary = "";
    let topics: string[] = [];

    if (LOVABLE_API_KEY && extractedText.length > 0) {
      try {
        // Limit text for AI analysis to first 5000 characters
        const textForAnalysis = extractedText.substring(0, 5000);

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
                content: "You are a document analyzer. Analyze the document and respond in JSON format with 'summary' (2-3 sentences) and 'topics' (array of 3-5 main topics).",
              },
              {
                role: "user",
                content: `Analyze this document content and provide a JSON response:\n\n${textForAnalysis}`,
              },
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";

          // Try to parse JSON response
          try {
            const parsed = JSON.parse(content);
            aiSummary = parsed.summary || content.substring(0, 200);
            topics = Array.isArray(parsed.topics) ? parsed.topics : [];
          } catch {
            // If not JSON, use the content as summary
            aiSummary = content.split('\n').slice(0, 3).join(' ').substring(0, 200);
            topics = ["Document Analysis"];
          }
        }
      } catch (error) {
        console.error("AI analysis failed:", error);
        aiSummary = `Document contains ${pageCount} pages with ${extractedText.length} characters of text.`;
        topics = ["General"];
      }
    } else {
      aiSummary = `Document processed: ${pageCount} pages, ${extractedText.length} characters`;
      topics = ["General"];
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
