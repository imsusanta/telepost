import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { cloudflareRunUrl, providerError } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";
const OPENAI_DEFAULT_IMAGE_MODEL = "dall-e-3";
const CLOUDFLARE_DEFAULT_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

type ImageProvider = "openrouter" | "cloudflare" | "openai";

interface ImageGenerationRequest {
  prompt: string;
  style: "realistic" | "cartoon" | "minimalist" | "artistic";
  aspectRatio: "1:1" | "16:9" | "9:16";
  colorScheme: "vibrant" | "pastel" | "dark" | "auto";
}

interface AISettings {
  provider: ImageProvider;
  model: string;
  image_model?: string;
  openrouter_image_model?: string;
  temperature: number;
  system_prompt?: string;
}

interface ResolvedImageProvider {
  provider: ImageProvider;
  apiKey: string;
  accountId?: string;
  model: string;
}

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function getAISettings(supabase: ReturnType<typeof createClient>): Promise<AISettings> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "ai_settings")
      .maybeSingle();
    if (data?.setting_value && typeof data.setting_value === "object") return data.setting_value as AISettings;
  } catch (error) {
    console.error("[ai-generate-image] Settings fetch error:", error);
  }
  return { provider: "openrouter", model: "", temperature: 0.7 };
}

function env(name: string): string {
  return Deno.env.get(name)?.trim() || "";
}

/** Resolve image credentials only from Edge Function environment secrets. */
function resolveImageProvider(settings: AISettings): ResolvedImageProvider {
  const openrouterKey = env("OPENROUTER_API_KEY");
  const openaiKey = env("OPENAI_API_KEY");
  const cloudflareToken = env("CLOUDFLARE_API_TOKEN");
  const cloudflareAccountId = env("CLOUDFLARE_ACCOUNT_ID");

  const configuredProvider = settings.provider === "cloudflare"
    ? "cloudflare"
    : settings.provider === "openai"
      ? "openai"
      : "openrouter";

  if (configuredProvider === "cloudflare") {
    const configured = settings.image_model?.trim();
    return {
      provider: "cloudflare",
      apiKey: cloudflareToken,
      accountId: cloudflareAccountId,
      model: configured?.startsWith("@cf/") ? configured : CLOUDFLARE_DEFAULT_IMAGE_MODEL,
    };
  }

  if (configuredProvider === "openai") {
    return {
      provider: "openai",
      apiKey: openaiKey,
      model: settings.image_model?.trim() || OPENAI_DEFAULT_IMAGE_MODEL,
    };
  }

  return {
    provider: "openrouter",
    apiKey: openrouterKey,
    model: settings.openrouter_image_model?.trim() || OPENROUTER_DEFAULT_IMAGE_MODEL,
  };
}

function buildPrompt(body: ImageGenerationRequest): string {
  const styleDescriptions = {
    realistic: "photorealistic, high detail, professional photography style",
    cartoon: "cartoon style, colorful, hand-drawn illustration, friendly and approachable",
    minimalist: "minimalist design, clean lines, simple shapes, modern aesthetic",
    artistic: "artistic, creative, painterly, expressive brush strokes, gallery-worthy",
  };
  const colorDescriptions = {
    vibrant: "vibrant and saturated colors, bold color palette",
    pastel: "soft pastel colors, gentle and soothing tones",
    dark: "dark theme, moody lighting, deep shadows",
    auto: "appropriate colors for the subject matter",
  };
  const aspectRatioMap = {
    "1:1": "square (1024x1024)",
    "16:9": "landscape (1792x1024)",
    "9:16": "portrait (1024x1792)",
  };

  return `A ${styleDescriptions[body.style] || styleDescriptions.realistic} image of: ${body.prompt}. `
    + `Aspect ratio: ${aspectRatioMap[body.aspectRatio] || aspectRatioMap["1:1"]}. `
    + `Color scheme: ${colorDescriptions[body.colorScheme] || colorDescriptions.auto}. `
    + "High quality, detailed, professional grade.";
}

const sizeMap: Record<string, string> = {
  "1:1": "1024x1024",
  "16:9": "1792x1024",
  "9:16": "1024x1792",
};

function extractOpenRouterImage(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const message = (data as { choices?: Array<{ message?: unknown }> }).choices?.[0]?.message;
  if (!message || typeof message !== "object") return "";
  const record = message as { images?: Array<{ image_url?: { url?: string }; url?: string }>; content?: unknown };
  const fromImages = record.images?.[0]?.image_url?.url || record.images?.[0]?.url;
  if (fromImages) return fromImages;

  if (Array.isArray(record.content)) {
    for (const part of record.content) {
      if (!part || typeof part !== "object") continue;
      const item = part as { image_url?: { url?: string }; type?: string; source?: { data?: string } };
      const url = item.image_url?.url || (item.type === "image" ? item.source?.data : "");
      if (url) return url;
    }
  }
  if (typeof record.content === "string") {
    const match = record.content.match(/https?:\/\/[^\s)]+/) || record.content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
    if (match) return match[0];
  }
  return "";
}

async function generateWithOpenAICompatibleImages(resolved: ResolvedImageProvider, prompt: string, size: string): Promise<string> {
  const url = resolved.provider === "openai"
    ? "https://api.openai.com/v1/images/generations"
    : "https://openrouter.ai/api/v1/images/generations";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolved.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: resolved.model.replace(/^openai\//, ""), prompt, n: 1, size }),
  });

  const body = await response.text();
  if (!response.ok) throw providerError(resolved.provider, response.status, body);
  const data: unknown = JSON.parse(body);
  if (!data || typeof data !== "object") throw new Error("Image provider returned an invalid response.");
  const item = (data as { data?: Array<{ url?: string; b64_json?: string }> }).data?.[0];
  const imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");
  if (!imageUrl) throw new Error("Image provider returned no image.");
  return imageUrl;
}

async function generateWithOpenRouterChat(resolved: ResolvedImageProvider, prompt: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolved.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://telepost.tech",
      "X-Title": "TelePost",
    },
    body: JSON.stringify({ model: resolved.model, modalities: ["image", "text"], messages: [{ role: "user", content: prompt }] }),
  });

  const body = await response.text();
  if (!response.ok) throw providerError("OpenRouter", response.status, body);
  const imageUrl = extractOpenRouterImage(JSON.parse(body) as unknown);
  if (!imageUrl) throw new Error("OpenRouter returned no image. Choose an image-capable model in Settings → AI.");
  return imageUrl;
}

async function generateWithCloudflare(resolved: ResolvedImageProvider, prompt: string): Promise<string> {
  if (!resolved.accountId) throw new Error("Cloudflare Account ID is missing. Configure CLOUDFLARE_ACCOUNT_ID as an Edge Function secret.");
  const response = await fetch(cloudflareRunUrl(resolved.accountId, resolved.model), {
    method: "POST",
    headers: { Authorization: `Bearer ${resolved.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) throw providerError("Cloudflare", response.status, await response.text());

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") throw new Error("Cloudflare returned an invalid image response.");
    const record = data as { success?: boolean; result?: { image?: string; images?: string[] } };
    if (record.success === false) throw providerError("Cloudflare", 500, JSON.stringify(data));
    const base64 = record.result?.image || record.result?.images?.[0];
    if (!base64) throw new Error("Cloudflare Workers AI returned no image.");
    return `data:image/jpeg;base64,${base64}`;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error("Cloudflare Workers AI returned an empty image.");
  return `data:${contentType || "image/png"};base64,${encodeBase64(bytes)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase configuration");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json() as ImageGenerationRequest;
    if (!body?.prompt?.trim()) return jsonResponse({ error: "Prompt is required" }, 400);

    const aiSettings = await getAISettings(supabase);
    const resolved = resolveImageProvider(aiSettings);

    if (!resolved.apiKey || (resolved.provider === "cloudflare" && !resolved.accountId)) {
      return jsonResponse({ error: `AI service is not configured for ${resolved.provider}. Configure the corresponding Edge Function secret.` }, 503);
    }

    const enhancedPrompt = buildPrompt(body);
    const size = sizeMap[body.aspectRatio] || "1024x1024";
    const startTime = Date.now();

    console.log(`[ai-generate-image] user=${user.id}, provider=${resolved.provider}, model=${resolved.model}`);

    let imageUrl = "";
    if (resolved.provider === "cloudflare") imageUrl = await generateWithCloudflare(resolved, enhancedPrompt);
    else if (resolved.provider === "openai" || /dall-e|gpt-image/i.test(resolved.model)) imageUrl = await generateWithOpenAICompatibleImages(resolved, enhancedPrompt, size);
    else imageUrl = await generateWithOpenRouterChat(resolved, enhancedPrompt);

    const generationTime = Date.now() - startTime;

    try {
      await supabase.from("ai_usage_logs").insert({
        user_id: user.id,
        feature: "image-generation",
        provider: resolved.provider,
        model: resolved.model,
        prompt: body.prompt,
        status: "success",
        success: true,
        completed_at: new Date().toISOString(),
        metadata: { model: resolved.model, provider: resolved.provider, generation_time_ms: generationTime },
      });
    } catch (logError) {
      console.error("[ai-generate-image] Failed to log usage:", logError);
    }

    return jsonResponse({ imageUrl, provider: resolved.provider, model: resolved.model, enhancedPrompt: enhancedPrompt.trim(), generationTimeMs: generationTime });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    console.error("[ai-generate-image] Error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
