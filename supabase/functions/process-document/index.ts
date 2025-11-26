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

    // Use AI to extract text from PDF
    let extractedText = "";
    let pageCount = 1;
    let aiSummary = "";
    let topics: string[] = [];

    if (LOVABLE_API_KEY) {
      try {
        console.log("Using AI to extract text and analyze document");

        // Convert blob to base64 in chunks to avoid stack overflow
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let base64 = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
          base64 += String.fromCharCode(...chunk);
        }
        base64 = btoa(base64);

        // Use AI with vision to extract text from PDF
        const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: "You are a document analyzer. Extract all text content from the provided PDF document and return it as plain text.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract all text from this PDF document. Return only the extracted text content."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:application/pdf;base64,${base64}`
                    }
                  }
                ]
              },
            ],
            temperature: 0.1,
          }),
        });

        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          extractedText = extractData.choices?.[0]?.message?.content || "";
          
          if (extractedText && extractedText.length > 100) {
            console.log(`Text extraction successful: ${extractedText.length} characters`);
            
            // Now analyze the extracted text for summary and topics
            const analyzeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                    content: `Analyze this document and provide:\n1. A brief summary (2-3 sentences)\n2. A list of main topics (3-5 topics as array)\n\nReturn ONLY a JSON object like: {"summary": "...", "topics": ["topic1", "topic2", ...]}\n\nDocument content:\n${extractedText.substring(0, 5000)}`,
                  },
                ],
                temperature: 0.3,
              }),
            });

            if (analyzeResponse.ok) {
              const analyzeData = await analyzeResponse.json();
              const content = analyzeData.choices?.[0]?.message?.content || "";

              try {
                const parsed = JSON.parse(content);
                aiSummary = parsed.summary || content.split('\n').slice(0, 3).join(' ');
                topics = Array.isArray(parsed.topics) && parsed.topics.length > 0
                  ? parsed.topics
                  : ["General"];
              } catch (e) {
                aiSummary = content.substring(0, 300);
                topics = ["General"];
              }
              console.log("AI analysis completed successfully");
            } else {
              console.error(`AI API error (${analyzeResponse.status})`);
              aiSummary = `Document processed with ${extractedText.length} characters`;
              topics = ["General"];
            }
          } else {
            console.warn("Insufficient text extracted from PDF");
            extractedText = "Document processed but text extraction was minimal. Please ensure the PDF is not encrypted or image-only.";
            aiSummary = extractedText;
            topics = ["General"];
          }
        } else {
          const errorText = await extractResponse.text();
          console.error(`AI extraction error (${extractResponse.status}):`, errorText);
          extractedText = "Failed to extract text from PDF using AI. The document may be encrypted or corrupted.";
          aiSummary = extractedText;
          topics = ["General"];
        }
      } catch (error) {
        console.error("AI extraction failed:", error);
        extractedText = `Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`;
        aiSummary = extractedText;
        topics = ["General"];
      }
    } else {
      console.log("LOVABLE_API_KEY not configured, skipping text extraction");
      extractedText = "Text extraction requires AI configuration. Please contact administrator.";
      aiSummary = extractedText;
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
