import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { classifyBearer, extractBearer, publicErrorMessage } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { isAmbiguousOutcome, telegramRequest } from "../_shared/telegram.ts";

const TELEGRAM_API_ORIGIN = "https://api.telegram.org";

function truncate(str: string, limit: number): string {
  if (!str) return "";
  const chars = Array.from(str);
  return chars.length > limit ? chars.slice(0, limit - 3).join("") + "..." : str;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");

  const classified = classifyBearer({
    authorizationHeader: req.headers.get("Authorization"),
    cronSecretHeader: req.headers.get("x-cron-secret"),
    cronSecret,
    serviceRoleKey,
  });

  if (classified === "missing") {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let callerUserId: string | null = null;
  const isInternal = classified === "internal";
  if (!isInternal) {
    const userClient = createClient(supabaseUrl, anonKey);
    const { data } = await userClient.auth.getUser(extractBearer(req.headers.get("Authorization")));
    if (!data?.user) return jsonResponse({ error: "Unauthorized" }, 401);
    callerUserId = data.user.id;
  }

  const workerId = crypto.randomUUID();
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (isInternal) {
      await admin.rpc("recover_scheduler_jobs");
    }

    const { data: posts, error: claimError } = await admin.rpc("claim_due_telegram_posts", {
      p_user_id: isInternal ? null : callerUserId,
      p_limit: 10,
      p_worker_id: workerId,
    });

    if (claimError) {
      console.error("claim_due_telegram_posts failed:", claimError.message);
      return jsonResponse({ error: "Unable to claim due posts" }, 500);
    }

    if (!posts || posts.length === 0) {
      return jsonResponse({ success: true, message: "No scheduled posts to process", processed: 0 });
    }

    const channelIds = [...new Set(posts.map((post: { channel_id?: string }) => post.channel_id).filter(Boolean))];
    const channelsById = new Map<string, { id: string; telegram_channel_id: string; telegram_bot_token: string; user_id: string }>();
    if (channelIds.length > 0) {
      const { data: channels } = await admin
        .from("channels")
        .select("id, telegram_channel_id, telegram_bot_token, user_id")
        .in("id", channelIds);
      for (const channel of channels || []) channelsById.set(channel.id, channel);
    }

    const globalToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    let successCount = 0;
    let failedCount = 0;
    const results: Array<Record<string, unknown>> = [];

    for (const post of posts) {
      const channel = post.channel_id ? channelsById.get(post.channel_id) : null;
      try {
        if (!isInternal && post.user_id !== callerUserId) {
          throw new Error("Forbidden");
        }

        const botToken = channel?.telegram_bot_token || globalToken;
        if (!botToken) throw Object.assign(new Error("No bot token available for this post."), { telegramKind: "definitive_failure" });
        const chatId = channel?.telegram_channel_id;
        if (!chatId) throw Object.assign(new Error("Chat ID not configured for this post."), { telegramKind: "definitive_failure" });

        const baseUrl = `${TELEGRAM_API_ORIGIN}/bot${botToken}`;
        const sendResult = post.image_url
          ? await telegramRequest(`${baseUrl}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              photo: post.image_url,
              caption: truncate(post.content || "", 1024),
              parse_mode: "Markdown",
            }),
          })
          : await telegramRequest(`${baseUrl}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: truncate(post.content || "", 4096),
              parse_mode: "Markdown",
            }),
          });

        if (sendResult.kind !== "success") {
          throw Object.assign(new Error(sendResult.description || "Failed to send"), { telegramKind: sendResult.kind });
        }

        const messageId = (sendResult.body as { result?: { message_id?: number } } | null)?.result?.message_id?.toString() || null;
        const { data: completed, error: completeError } = await admin.rpc("complete_telegram_post", {
          p_id: post.id,
          p_worker_id: workerId,
          p_status: "posted",
          p_message_id: messageId,
          p_chat_id: String(chatId),
        });
        if (completeError || completed !== true) {
          throw new Error("Failed to record posted status");
        }

        successCount++;
        results.push({ id: post.id, status: "success" });
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const kind = (error as { telegramKind?: string }).telegramKind;
        const ambiguous = kind ? isAmbiguousOutcome(kind as "timeout") : false;
        const status = ambiguous ? "scheduled" : "failed";
        const { error: completeError } = await admin.rpc("complete_telegram_post", {
          p_id: post.id,
          p_worker_id: workerId,
          p_status: status,
          p_error: publicErrorMessage(error, "Unknown error"),
        });
        if (completeError) console.error("Failed to record telegram post outcome:", completeError);
        failedCount++;
        results.push({ id: post.id, status: ambiguous ? "retrying" : "failed", error: publicErrorMessage(error, "Unknown error") });
      }
    }

    return jsonResponse({
      success: true,
      processed: posts.length,
      successful: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error("Error in process-scheduled-telegram-posts:", error);
    return jsonResponse({ error: publicErrorMessage(error, "Unable to process scheduled posts") }, 500);
  }
});
