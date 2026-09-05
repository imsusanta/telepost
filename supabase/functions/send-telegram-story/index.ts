import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { callerOwnsPostAndChannel, classifyBearer, extractBearer, publicErrorMessage } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { isAmbiguousOutcome, type TelegramSendKind } from "../_shared/telegram.ts";
import { sendStoryToTelegram } from "../_shared/story.ts";

interface TelegramStoryRequest {
  storyId?: string;
  instantPost?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let claimedStoryId: string | null = null;
  let workerId: string | null = null;
  let previousStatus: string | null = null;

  try {
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
    let isSuperAdmin = false;

    if (!isInternal) {
      const userClient = createClient(supabaseUrl, anonKey);
      const { data, error } = await userClient.auth.getUser(extractBearer(req.headers.get("Authorization")));
      if (error || !data?.user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      callerUserId = data.user.id;
      const { data: superAdmin } = await admin.rpc("is_super_admin", { p_user_id: callerUserId });
      isSuperAdmin = superAdmin === true;
    }

    const body = (await req.json().catch(() => ({}))) as TelegramStoryRequest;
    const storyId = body.storyId;
    const instantPost = body.instantPost === true;

    if (!storyId || typeof storyId !== "string") {
      return jsonResponse({ error: "Missing required field: storyId" }, 400);
    }

    const { data: story, error: storyError } = await admin
      .from("telegram_stories")
      .select("story_id, user_id, channel_id, status, telegram_message_id, media_type, media_url, caption, text_overlay, stickers, duration_hours, is_highlight")
      .eq("story_id", storyId)
      .maybeSingle();

    if (storyError || !story) {
      return jsonResponse({ error: "Story not found" }, 404);
    }

    let channelUserId: string | null = null;
    let chatId: string | null = null;
    let channelBotToken: string | null = null;

    if (story.channel_id) {
      const { data: channel, error: channelError } = await admin
        .from("channels")
        .select("id, user_id, telegram_channel_id, telegram_bot_token")
        .eq("id", story.channel_id)
        .maybeSingle();
      if (channelError || !channel) {
        return jsonResponse({ error: "Channel not found" }, 404);
      }
      channelUserId = channel.user_id;
      chatId = channel.telegram_channel_id;
      channelBotToken = channel.telegram_bot_token;
    }

    if (!isInternal) {
      const allowed = callerOwnsPostAndChannel({
        callerUserId: callerUserId!,
        postUserId: story.user_id,
        channelUserId,
        isSuperAdmin,
      });
      if (!allowed) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    }

    if (story.telegram_message_id) {
      return jsonResponse({
        success: true,
        already_posted: true,
        messageId: story.telegram_message_id,
      });
    }

    if (!instantPost && story.status !== "scheduled") {
      return jsonResponse({ error: "Story is not scheduled" }, 409);
    }
    if (instantPost && story.status !== "draft" && story.status !== "scheduled") {
      return jsonResponse({ error: "Story cannot be sent in its current state" }, 409);
    }

    workerId = crypto.randomUUID();
    previousStatus = story.status;

    const { data: claimed, error: claimError } = await admin.rpc("claim_telegram_story_for_dispatch", {
      p_story_id: storyId,
      p_user_id: isInternal ? null : callerUserId,
      p_worker_id: workerId,
      p_allow_scheduled: true,
    });

    if (claimError) {
      console.error("claim_telegram_story_for_dispatch failed:", claimError.message);
      return jsonResponse({ error: "Unable to claim story" }, 409);
    }
    if (!claimed || claimed.length === 0) {
      return jsonResponse({ error: "Story is already being sent or is not sendable" }, 409);
    }
    claimedStoryId = storyId;

    const globalToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    let botToken = channelBotToken || null;
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
    if (!botToken) {
      throw new Error("No bot token available. Please configure a bot token in channel settings.");
    }
    if (!chatId) {
      throw new Error("Chat ID not configured. Please add your Telegram channel ID in channel settings.");
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
    const { data: completed, error: completeError } = await admin.rpc("complete_telegram_story", {
      p_story_id: storyId,
      p_worker_id: workerId,
      p_status: "posted",
      p_message_id: messageId,
      p_chat_id: String(chatId),
    });

    if (completeError || completed !== true) {
      console.error("Failed to record posted story status:", completeError);
      return jsonResponse({
        success: true,
        message: "Story sent to Telegram, but status could not be recorded",
        messageId,
      });
    }

    return jsonResponse({
      success: true,
      message: "Story posted successfully to Telegram",
      messageId,
    });
  } catch (error) {
    console.error("Error sending Telegram story:", error);
    const kind = (error as { telegramKind?: TelegramSendKind }).telegramKind;
    const ambiguous = kind ? isAmbiguousOutcome(kind) : false;

    if (claimedStoryId && workerId) {
      const releaseStatus = ambiguous ? (previousStatus === "scheduled" ? "scheduled" : "draft") : "failed";
      const { error: completeError } = await admin.rpc("complete_telegram_story", {
        p_story_id: claimedStoryId,
        p_worker_id: workerId,
        p_status: releaseStatus,
        p_error: ambiguous ? "ambiguous_send_timeout" : publicErrorMessage(error, "Failed to send story"),
      });
      if (completeError) {
        console.error("Failed to record story send failure:", completeError);
      }
    }

    return jsonResponse({
      error: publicErrorMessage(error, "Failed to send story"),
    }, 500);
  }
});
