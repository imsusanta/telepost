import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { classifyBearer, publicErrorMessage } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { isAmbiguousOutcome, persistWithRetry, type TelegramSendKind } from "../_shared/telegram.ts";
import { sendStoryToTelegram } from "../_shared/story.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");

  const classified = classifyBearer({
    authorizationHeader: req.headers.get("Authorization"),
    cronSecretHeader: req.headers.get("x-cron-secret"),
    cronSecret,
    serviceRoleKey,
  });

  if (classified !== "internal") {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const workerId = crypto.randomUUID();

  try {
    const { error: recoverError } = await admin.rpc("recover_scheduler_jobs");
    if (recoverError) {
      console.warn("recover_scheduler_jobs failed:", recoverError.message);
    }

    const { data: stories, error: claimError } = await admin.rpc("claim_due_telegram_stories", {
      p_user_id: null,
      p_limit: 10,
      p_worker_id: workerId,
    });

    if (claimError) {
      console.error("claim_due_telegram_stories failed:", claimError.message);
      return jsonResponse({ error: "Unable to claim stories" }, 500);
    }

    if (!stories || stories.length === 0) {
      return jsonResponse({
        success: true,
        message: "No scheduled stories to process",
        processed: 0,
      });
    }

    const globalToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    let successCount = 0;
    let failedCount = 0;
    const results: Array<Record<string, unknown>> = [];

    for (const story of stories) {
      const storyId = String(story.story_id);
      try {
        if (story.telegram_message_id) {
          await persistWithRetry(async () => {
            const { data, error } = await admin.rpc("complete_telegram_story", {
              p_story_id: storyId,
              p_worker_id: workerId,
              p_status: "posted",
              p_message_id: story.telegram_message_id,
            });
            return !error && data === true;
          });
          successCount += 1;
          results.push({ story_id: storyId, status: "already_posted" });
          continue;
        }

        let botToken: string | null = null;
        let chatId: string | null = null;

        if (story.channel_id) {
          const { data: channel } = await admin
            .from("channels")
            .select("telegram_bot_token, telegram_channel_id")
            .eq("id", story.channel_id)
            .maybeSingle();
          botToken = channel?.telegram_bot_token || null;
          chatId = channel?.telegram_channel_id || null;
        }

        if (!botToken && story.user_id) {
          const { data: botChannel } = await admin
            .from("channels")
            .select("telegram_bot_token")
            .eq("user_id", story.user_id)
            .not("telegram_bot_token", "is", null)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          botToken = botChannel?.telegram_bot_token || null;
        }
        if (!botToken) botToken = globalToken || null;
        if (!botToken) throw new Error("No bot token available for this story.");
        if (!chatId) throw new Error("Chat ID not configured");

        const marked = await persistWithRetry(async () => {
          const { data, error } = await admin.rpc("mark_telegram_story_dispatch_started", {
            p_story_id: storyId,
            p_worker_id: workerId,
          });
          return !error && data === true;
        });
        if (!marked) {
          throw new Error("Story dispatch could not be started");
        }

        const sendResult = await sendStoryToTelegram({
          botToken,
          chatId,
          story,
        });

        if (sendResult.kind !== "success") {
          const error = new Error(sendResult.description || "Failed to send story") as Error & { telegramKind?: string };
          error.telegramKind = sendResult.kind;
          throw error;
        }

        const messageId = (sendResult.body as { result?: { message_id?: number } } | null)?.result?.message_id?.toString() || null;
        const recorded = await persistWithRetry(async () => {
          const { data, error } = await admin.rpc("complete_telegram_story", {
            p_story_id: storyId,
            p_worker_id: workerId,
            p_status: "posted",
            p_message_id: messageId,
            p_chat_id: chatId,
          });
          return !error && data === true;
        });
        if (!recorded) {
          console.error("Failed to record posted story status after retries", storyId);
        }
        successCount += 1;
        results.push({
          story_id: storyId,
          status: recorded ? "success" : "sent_unrecorded",
          message_id: messageId,
        });
      } catch (error) {
        const kind = (error as { telegramKind?: TelegramSendKind }).telegramKind;
        const ambiguous = kind ? isAmbiguousOutcome(kind) : false;
        const releaseStatus = ambiguous ? "scheduled" : "failed";
        await admin.rpc("complete_telegram_story", {
          p_story_id: storyId,
          p_worker_id: workerId,
          p_status: releaseStatus,
          p_error: ambiguous ? "ambiguous_send_timeout" : publicErrorMessage(error, "Failed to send story"),
        });
        failedCount += 1;
        results.push({
          story_id: storyId,
          status: releaseStatus === "scheduled" ? "released" : "failed",
          error: publicErrorMessage(error, "Failed to send story"),
        });
      }
    }

    return jsonResponse({
      success: true,
      processed: stories.length,
      successful: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error("Error processing scheduled stories:", error);
    return jsonResponse({
      error: publicErrorMessage(error, "Unknown error"),
    }, 500);
  }
});
