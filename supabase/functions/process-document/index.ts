import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AISettings {
  provider: 'openrouter' | 'lovable' | 'gemini' | 'openai';
  model: string;
  temperature: number;
  openrouter_api_key?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
  system_prompt?: string;
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
      const settings = data.setting_value as AISettings;
      // Force gpt-4o-mini if provider is lovable or using an old-style/unreliable model
      if (settings.provider === 'lovable' || settings.model.includes('glm-4.5-air')) {
        return {
          ...settings,
          provider: 'lovable',
          model: 'openai/gpt-4o-mini'
        };
      }
      return settings;
    }
  } catch (error) {
    console.error("Failed to fetch AI settings:", error);
  }

  return {
    provider: 'lovable',
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
    openrouter_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
    system_prompt: '',
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== PDF Processing Request Started ===");

    // Initialize Supabase with service role key for server-to-server operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentId, storagePath, publicUrl, userId } = await req.json();

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

    // SECURITY: Verify the document exists and get owner info
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

    // If userId was passed, verify it matches (optional extra security layer)
    if (userId && document.user_id !== userId) {
      console.error(`Unauthorized: Passed userId ${userId} does not match document owner ${document.user_id}`);
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ Document ownership verified for user ${document.user_id}`);

    // Get AI settings from database
    const aiSettings = await getAISettings(supabase);

    const testModel = aiSettings.model;
    const provider = aiSettings.provider || 'openrouter';

    // Choose key based on provider
    let apiKey = '';
    let finalProvider = provider;

    if (provider === 'gemini') {
      apiKey = aiSettings.gemini_api_key!;
    } else if (provider === 'openai') {
      apiKey = aiSettings.openai_api_key!;
    } else if (provider === 'openrouter') {
      apiKey = aiSettings.openrouter_api_key!;
    } else if (provider === 'lovable') {
      apiKey = aiSettings.openrouter_api_key!;
      finalProvider = 'openrouter';
    } else {
      // Auto-detect if provider is unknown or missing
      if (testModel.toLowerCase().includes('gemini')) {
        finalProvider = 'gemini';
        apiKey = aiSettings.gemini_api_key!;
      } else {
        finalProvider = 'openrouter';
        apiKey = aiSettings.openrouter_api_key!;
      }
    }

    if (!apiKey) {
      throw new Error(`AI service not configured (${finalProvider} API Key missing in Settings)`);
    }

    console.log(`Using ${finalProvider} with model: ${aiSettings.model}`);

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

    if (fileData.size === 0) {
      console.error("Downloaded file is empty");
      throw new Error("The PDF file is empty or could not be read from storage.");
    }

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

      let isExtractOk = false;
      let extractStatus = 0;

      // Use AI with vision to extract text from PDF
      if (finalProvider === 'gemini') {
        console.log("Sending PDF to Direct Gemini for text extraction...");
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.model}:generateContent?key=${apiKey}`;
        const extractResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Extract all text from this PDF document. Return only the extracted text content. No markdown code blocks." },
                { inlineData: { mimeType: "application/pdf", data: base64 } }
              ]
            }],
            generationConfig: { temperature: 0.1 }
          })
        });

        isExtractOk = extractResponse.ok;
        extractStatus = extractResponse.status;

        if (isExtractOk) {
          const geminiData = await extractResponse.json();
          extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          const errorText = await extractResponse.text();
          console.error("Gemini Extraction Error:", errorText);
        }
      } else if (finalProvider === 'openai') {
        console.log("Sending PDF to Direct OpenAI for text extraction...");
        const extractResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
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

        isExtractOk = extractResponse.ok;
        extractStatus = extractResponse.status;

        if (isExtractOk) {
          const extractData = await extractResponse.json();
          extractedText = extractData.choices?.[0]?.message?.content || "";
        } else {
          const errorText = await extractResponse.text();
          console.error(`OpenAI extraction error (${extractStatus}):`, errorText);
        }
      } else {
        console.log("Sending PDF to OpenRouter for text extraction...");
        const extractResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
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

        isExtractOk = extractResponse.ok;
        extractStatus = extractResponse.status;

        if (isExtractOk) {
          const extractData = await extractResponse.json();
          extractedText = extractData.choices?.[0]?.message?.content || "";
        } else {
          const errorText = await extractResponse.text();
          console.error(`OpenRouter extraction error (${extractStatus}):`, errorText);
        }
      }

      if (isExtractOk) {
        console.log(`✓ AI extraction response received (status: ${extractStatus})`);

        if (extractedText && extractedText.length > 100) {
          console.log(`✓ Text extraction successful: ${extractedText.length} characters`);

          // Now analyze the extracted text for summary and topics
          console.log("Analyzing extracted text for summary and topics...");

          let analyzeOk = false;
          let analyzeContent = "";

          if (finalProvider === 'gemini') {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.model}:generateContent?key=${apiKey}`;
            const analyzeResponse = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: `Analyze this document and provide:\n1. A brief summary (2-3 sentences)\n2. A list of main topics (3-5 topics as array)\n\nReturn ONLY a JSON object like: {"summary": "...", "topics": ["topic1", "topic2", ...]}\n\nDocument content:\n${extractedText.substring(0, 5000)}` }]
                }],
                generationConfig: { temperature: 0.3 }
              })
            });
            analyzeOk = analyzeResponse.ok;
            if (analyzeOk) {
              const data = await analyzeResponse.json();
              analyzeContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }
          } else if (finalProvider === 'openai') {
            const analyzeResponse = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
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
            analyzeOk = analyzeResponse.ok;
            if (analyzeOk) {
              const analyzeData = await analyzeResponse.json();
              analyzeContent = analyzeData.choices?.[0]?.message?.content || "";
            }
          } else {
            const analyzeResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
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
            analyzeOk = analyzeResponse.ok;
            if (analyzeOk) {
              const analyzeData = await analyzeResponse.json();
              analyzeContent = analyzeData.choices?.[0]?.message?.content || "";
            }
          }

          if (analyzeOk) {
            console.log(`✓ Analysis response received`);

            try {
              let cleanedAnalyze = analyzeContent.trim();
              const startPos = cleanedAnalyze.indexOf('{');
              const endPos = cleanedAnalyze.lastIndexOf('}');

              if (startPos !== -1 && endPos !== -1) {
                cleanedAnalyze = cleanedAnalyze.substring(startPos, endPos + 1);
              }

              const parsed = JSON.parse(cleanedAnalyze);
              aiSummary = parsed.summary || analyzeContent.split('\n').slice(0, 3).join(' ');
              topics = Array.isArray(parsed.topics) && parsed.topics.length > 0
                ? parsed.topics
                : ["General"];
              console.log(`✓ Extracted ${topics.length} topics: ${topics.join(', ')}`);
            } catch (e) {
              console.warn("Failed to parse analysis JSON, using fallback");
              console.warn("Original content:", analyzeContent);
              aiSummary = analyzeContent.substring(0, 300);
              topics = ["General"];
            }
            console.log("✓ AI analysis completed successfully");
          } else {
            console.error(`AI analysis error`);
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
        // Check for specific error types
        if (extractStatus === 401 || extractStatus === 403) {
          // Authentication error is critical
          console.error("AI API authentication failed");
          extractedText = "AI API authentication failed. Please check your API key in the Settings page.";
          aiSummary = extractedText;
          topics = ["Needs Configuration"];
        } else if (extractStatus === 429) {
          extractedText = "AI API rate limit exceeded. Please try again later.";
          aiSummary = extractedText;
          topics = ["Rate Limited"];
        } else if (extractStatus === 402) {
          extractedText = "AI API quota exceeded. Please check your billing.";
          aiSummary = extractedText;
          topics = ["Quota Exceeded"];
        } else {
          // Non-critical failure (e.g., model doesn't support PDF)
          console.warn(`AI extraction failed with status ${extractStatus}. Using fallback.`);
          extractedText = "This document was uploaded but automatic text extraction was not possible. You can still use it for reference or try re-uploading with a different AI model configured (Gemini is recommended for PDFs).";
          aiSummary = "Document uploaded. AI text extraction was not available for this file.";
          topics = ["General"];
        }
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

    // Return a more descriptive error even in 500
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while processing PDF";
    const errorDetails = error instanceof Error ? error.stack : undefined;

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
        status: "failed"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
