import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AISettings {
  provider: 'openrouter';
  model: string;
  temperature: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAISettings(supabase: any): Promise<AISettings> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_settings')
      .maybeSingle();

    if (error) {
      console.error("Error fetching AI settings:", error);
    }

    if (data?.setting_value) {
      return data.setting_value as AISettings;
    }
  } catch (error) {
    console.error("Failed to fetch AI settings:", error);
  }

  return {
    provider: 'openrouter',
    model: 'z-ai/glm-4.5-air:free',
    temperature: 0.7,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== PDF Processing Request Started ===");
    
    // SECURITY: Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnon) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ User authenticated: ${user.id}`);

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

    // Verify document ownership before processing
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceKey) {
      console.error("Missing service role key");
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // SECURITY: Verify the document belongs to the authenticated user
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', documentId)
      .single();
    
    if (docError || !document) {
      console.error("Document not found:", docError?.message);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (document.user_id !== user.id) {
      console.error(`Unauthorized: User ${user.id} attempted to access document owned by ${document.user_id}`);
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`✓ Document ownership verified for user ${user.id}`);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    if (!OPENROUTER_API_KEY) {
      console.error("CRITICAL: OPENROUTER_API_KEY environment variable is not set");
      throw new Error("AI configuration missing. Please add OpenRouter API key in admin settings.");
    }

    // Get AI settings from database
    const aiSettings = await getAISettings(supabase);
    console.log(`Environment: Using OpenRouter model: ${aiSettings.model}`);

    // Download PDF from storage
    console.log(`Downloading file from storage: ${storagePath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError) {
      console.error(`DOWNLOAD ERROR for ${storagePath}:`, JSON.stringify(downloadError));
      throw new Error(`Failed to download PDF: ${downloadError.message || 'Unknown download error'}`);
    }

    if (!fileData) {
      console.error(`No file data received for ${storagePath}`);
      throw new Error("Failed to download PDF: No data received");
    }

    console.log(`✓ File downloaded successfully, size: ${fileData.size} bytes (${(fileData.size / 1024 / 1024).toFixed(2)} MB)`);

    // Server-side PDF validation: Check magic bytes
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (fileData.size > MAX_FILE_SIZE) {
      console.error(`File too large: ${fileData.size} bytes (max: ${MAX_FILE_SIZE})`);
      return new Response(
        JSON.stringify({ error: 'File size exceeds maximum limit of 50MB' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate PDF magic bytes (%PDF)
    const headerBuffer = await fileData.slice(0, 4).arrayBuffer();
    const header = new Uint8Array(headerBuffer);
    const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF
    const isPDF = PDF_MAGIC_BYTES.every((byte, index) => header[index] === byte);
    
    if (!isPDF) {
      console.error(`Invalid PDF: File does not have valid PDF signature. Got: ${Array.from(header).map(b => b.toString(16)).join(' ')}`);
      return new Response(
        JSON.stringify({ error: 'Invalid file format. Only PDF files are supported.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ PDF file validation passed`);

    // Use AI to extract text from PDF
    let extractedText = "";
    let pageCount = 1;
    let aiSummary = "";
    let topics: string[] = [];

    try {
      console.log("=== Starting AI Text Extraction ===");

      // Convert blob to base64 in chunks to avoid stack overflow
      console.log("Converting PDF to base64...");
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let base64 = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        base64 += String.fromCharCode(...chunk);
      }
      base64 = btoa(base64);
      console.log(`✓ PDF converted to base64 (${base64.length} characters)`);

      // Use AI with vision to extract text from PDF
      console.log("Sending PDF to OpenRouter for text extraction...");
      const extractResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": supabaseUrl,
            "X-Title": "QuizMaker Document Processing",
          },
          body: JSON.stringify({
            model: aiSettings.model,
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
        console.log(`✓ AI extraction response received (status: ${extractResponse.status})`);
        const extractData = await extractResponse.json();
        extractedText = extractData.choices?.[0]?.message?.content || "";

        if (extractedText && extractedText.length > 100) {
          console.log(`✓ Text extraction successful: ${extractedText.length} characters`);

          // Now analyze the extracted text for summary and topics
          console.log("Analyzing extracted text for summary and topics...");
          const analyzeResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": supabaseUrl,
                "X-Title": "QuizMaker Document Analysis",
              },
              body: JSON.stringify({
                model: aiSettings.model,
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
            console.log(`✓ Analysis response received (status: ${analyzeResponse.status})`);
            const analyzeData = await analyzeResponse.json();
            const content = analyzeData.choices?.[0]?.message?.content || "";

            try {
              const parsed = JSON.parse(content);
              aiSummary = parsed.summary || content.split('\n').slice(0, 3).join(' ');
              topics = Array.isArray(parsed.topics) && parsed.topics.length > 0
                ? parsed.topics
                : ["General"];
              console.log(`✓ Extracted ${topics.length} topics: ${topics.join(', ')}`);
            } catch (e) {
              console.warn("Failed to parse analysis JSON, using fallback");
              aiSummary = content.substring(0, 300);
              topics = ["General"];
            }
            console.log("✓ AI analysis completed successfully");
          } else {
            const errorText = await analyzeResponse.text();
            console.error(`AI analysis error (${analyzeResponse.status}):`, errorText);
            aiSummary = `Document processed with ${extractedText.length} characters`;
            topics = ["General"];
          }
        } else {
          console.warn("⚠ Insufficient text extracted from PDF (less than 100 characters)");
          extractedText = "Document processed but text extraction was minimal. Please ensure the PDF is not encrypted or image-only.";
          aiSummary = extractedText;
          topics = ["General"];
        }
      } else {
        const errorText = await extractResponse.text();
        console.error(`AI extraction error (${extractResponse.status}):`, errorText);

        // Check for specific error types
        if (extractResponse.status === 401 || extractResponse.status === 403) {
          throw new Error("AI API authentication failed. Please check API key configuration.");
        } else if (extractResponse.status === 429) {
          throw new Error("AI API rate limit exceeded. Please try again later.");
        } else if (extractResponse.status === 402) {
          throw new Error("AI API quota exceeded. Please check your billing.");
        }

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

    // Ensure we always have valid data
    const response = {
      extractedText: extractedText || "Error: Could not extract text from PDF",
      pageCount: pageCount || 1,
      aiSummary: aiSummary || "Document processed",
      topics: (topics && topics.length > 0) ? topics : ["General"],
    };

    console.log(`=== Document ${documentId} processed successfully ===`);
    console.log(`Final stats: ${response.extractedText.length} chars, ${response.pageCount} pages, ${response.topics.length} topics`);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("=== ERROR PROCESSING DOCUMENT ===");
    console.error("Error details:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred while processing PDF",
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
