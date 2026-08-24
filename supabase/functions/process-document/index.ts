// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs";
import { chatCompletion, parseJsonObject, resolveAIProvider, type AISettings } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAISettings(supabase: any): Promise<AISettings> {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
  return data?.setting_value || { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', temperature: 0.7 };
}

async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pageCount: number }> {
  const loadingTask = pdfjs.getDocument({ data: bytes, disableWorker: true, useWorkerFetch: false, isEvalSupported: false });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => typeof item?.str === 'string' ? item.str : '').filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (pageText) pages.push(pageText);
  }
  return { text: pages.join('\n\n'), pageCount: pdf.numPages };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase configuration');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { documentId, storagePath, userId } = await req.json();
    if (!documentId || !storagePath) return new Response(JSON.stringify({ error: 'documentId and storagePath are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: document, error: documentError } = await supabase.from('documents').select('user_id').eq('id', documentId).single();
    if (documentError || !document) return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (userId && userId !== document.user_id) return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: fileData, error: downloadError } = await supabase.storage.from('documents').download(storagePath);
    if (downloadError || !fileData) throw new Error(`Failed to download PDF: ${downloadError?.message || 'No data'}`);
    if (fileData.size === 0) throw new Error('The PDF file is empty.');
    if (fileData.size > 50 * 1024 * 1024) return new Response(JSON.stringify({ error: 'File size exceeds maximum limit of 50MB' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) return new Response(JSON.stringify({ error: 'Invalid file format. Only PDF files are supported.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let extractedText = '';
    let pageCount = 1;
    try {
      const extracted = await extractPdfText(bytes);
      extractedText = extracted.text;
      pageCount = extracted.pageCount;
    } catch (error) {
      console.error('[process-document] PDF text extraction failed:', error);
      throw new Error('Could not read this PDF. It may be encrypted, image-only, or corrupted.');
    }

    if (extractedText.length < 50) {
      return new Response(JSON.stringify({
        extractedText: 'This PDF contains little or no selectable text. OCR is required for scanned documents.',
        pageCount,
        aiSummary: 'Document uploaded, but automatic text extraction found no readable text.',
        topics: ['Needs OCR'],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiSettings = await getAISettings(supabase);
    const resolved = resolveAIProvider(aiSettings);
    if (!resolved.apiKey || (resolved.provider === 'cloudflare' && !resolved.accountId)) throw new Error(`AI credentials are missing for ${resolved.provider}. Configure Super Admin → Settings → AI.`);

    const analysisPrompt = `Analyze this document. Return only JSON with a concise 2-3 sentence summary and 3-5 main topics:\n{"summary":"...","topics":["..."]}\n\nDOCUMENT:\n${extractedText.substring(0, 12000)}`;
    let aiSummary = `Document processed with ${extractedText.length} characters.`;
    let topics: string[] = ['General'];
    try {
      const analysisText = await chatCompletion({
        resolved,
        messages: [
          { role: 'system', content: `${aiSettings.system_prompt || ''}\nYou are a document analyst. Output only valid JSON.` },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.3,
        maxTokens: 1024,
        timeoutMs: 90000,
        appTitle: 'TelePost Document Processing',
      });
      const parsed = parseJsonObject(analysisText) as any;
      if (typeof parsed.summary === 'string' && parsed.summary.trim()) aiSummary = parsed.summary.trim();
      if (Array.isArray(parsed.topics) && parsed.topics.length) topics = parsed.topics.filter((topic: unknown) => typeof topic === 'string').slice(0, 5);
    } catch (analysisError) {
      console.error('[process-document] AI analysis failed:', analysisError);
    }

    return new Response(JSON.stringify({ extractedText, pageCount, aiSummary, topics, provider: resolved.provider, model: resolved.model }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[process-document] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred while processing PDF', status: 'failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
