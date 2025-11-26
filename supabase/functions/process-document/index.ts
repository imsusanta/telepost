import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="npm:@types/pdf-parse@1.1.1"
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
      console.error("Missing documentId in request");
      return new Response(
        JSON.stringify({ error: "Missing documentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!storagePath) {
      console.error("Missing storagePath in request");
      return new Response(
        JSON.stringify({ error: "Missing storagePath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing document ${documentId} from ${storagePath}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Download PDF from storage
    console.log(`Downloading file from storage: ${storagePath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError) {
      console.error(`Download error for ${storagePath}:`, downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    if (!fileData) {
      console.error(`No file data received for ${storagePath}`);
      throw new Error("Failed to download PDF: No data received");
    }

    console.log(`File downloaded successfully, size: ${fileData.size} bytes`);

    // Extract text from PDF using pdf-parse
    let extractedText = "";
    let pageCount = 1;

    try {
      console.log("Extracting text from PDF...");

      // Convert blob to ArrayBuffer
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Parse PDF
      const pdfData = await pdfParse(buffer);

      extractedText = pdfData.text || "";
      pageCount = pdfData.numpages || 1;

      console.log(`PDF parsing successful: ${pageCount} pages, ${extractedText.length} characters extracted`);

      // If no text extracted, provide helpful error
      if (!extractedText || extractedText.trim().length === 0) {
        console.warn("PDF parsed but no text extracted - might be image-based or encrypted");
        extractedText = "No text could be extracted from this PDF. The PDF might contain only images or be encrypted. Please try a different PDF or use OCR-enabled PDF.";
      }
    } catch (error) {
      console.error("PDF parsing error:", error);
      // Fallback if PDF parsing fails
      extractedText = `Error extracting text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the PDF is not encrypted or corrupted.`;
      pageCount = 1;
    }

    // Use AI to generate summary and topics
    let aiSummary = "";
    let topics: string[] = [];

    // Generate AI summary and topics only if we have extracted text
    if (LOVABLE_API_KEY && extractedText && extractedText.length > 50 && !extractedText.startsWith("Error") && !extractedText.startsWith("No text")) {
      try {
        console.log("Calling AI for document analysis");

        // Limit text sent to AI to avoid token limits (first 5000 chars)
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
                content: "You are a document analyzer. Analyze the document and provide a brief summary (2-3 sentences) and list of main topics as a JSON object with keys 'summary' and 'topics' (array of strings).",
              },
              {
                role: "user",
                content: `Analyze this document and provide:\n1. A brief summary (2-3 sentences)\n2. A list of main topics (3-5 topics as array)\n\nReturn ONLY a JSON object like: {"summary": "...", "topics": ["topic1", "topic2", ...]}\n\nDocument content:\n${textForAnalysis}`,
              },
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";

          try {
            // Try to parse JSON response
            const parsed = JSON.parse(content);
            aiSummary = parsed.summary || content.split('\n').slice(0, 3).join(' ');
            topics = Array.isArray(parsed.topics) && parsed.topics.length > 0
              ? parsed.topics
              : ["General"];
          } catch (e) {
            // Fallback if not JSON
            aiSummary = content.substring(0, 300);
            topics = ["General"];
          }
          console.log("AI analysis completed successfully");
        } else {
          const errorText = await aiResponse.text();
          console.error(`AI API error (${aiResponse.status}):`, errorText);
          aiSummary = `Document contains ${pageCount} page(s) with ${extractedText.length} characters`;
          topics = ["General"];
        }
      } catch (error) {
        console.error("AI analysis failed:", error);
        aiSummary = `Document contains ${pageCount} page(s) with ${extractedText.length} characters`;
        topics = ["General"];
      }
    } else {
      console.log("Skipping AI analysis - no valid text extracted or API key not configured");
      aiSummary = extractedText.startsWith("Error") || extractedText.startsWith("No text")
        ? extractedText.substring(0, 200)
        : `Document processed: ${pageCount} page(s), ${extractedText.length} characters extracted`;
      topics = ["General"];
    }

    // Ensure we always have valid data
    const response = {
      extractedText: extractedText || "Error: Could not extract text from PDF",
      pageCount: pageCount || 1,
      aiSummary: aiSummary || "Document processed",
      topics: (topics && topics.length > 0) ? topics : ["General"],
    };

    console.log(`Document ${documentId} processed successfully`);

    return new Response(
      JSON.stringify(response),
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
