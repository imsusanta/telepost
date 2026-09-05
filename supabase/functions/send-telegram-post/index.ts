import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { callerOwnsPostAndChannel, classifyBearer, extractBearer, publicErrorMessage } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { telegramRequest } from "../_shared/telegram.ts";

interface TelegramPostRequest {
  postId?: string;
  instantPost?: boolean;
}

function truncate(str: string, limit: number): string {
  if (!str) return "";
  return str.length > limit ? str.substring(0, limit - 3) + "..." : str;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function markdownToHtml(text: string): string {
  if (!text) return "";
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  html = html.replace(/\*(.*?)\*/g, "<b>$1</b>");
  html = html.replace(/_(.*?)_/g, "<i>$1</i>");
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");
  return html;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");

  let claimedPostId: string | null = null;
  let workerId: string | null = null;
  let previousStatus: string | null = null;
  const admin = createClient(supabaseUrl, serviceRoleKey);

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
    let isInternal = classified === "internal";
    let isSuperAdmin = false;

    if (!isInternal) {
      const bearer = extractBearer(req.headers.get("Authorization"));
      const userClient = createClient(supabaseUrl, anonKey);
      const { data, error } = await userClient.auth.getUser(bearer);
      if (error || !data?.user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      callerUserId = data.user.id;
      const { data: superAdmin } = await admin.rpc("is_super_admin", { p_user_id: callerUserId });
      isSuperAdmin = superAdmin === true;
    }

    const body = (await req.json().catch(() => ({}))) as TelegramPostRequest;
    const postId = body.postId;
    const instantPost = body.instantPost === true;

    if (!postId || typeof postId !== "string") {
      return jsonResponse({ error: "Missing required field: postId" }, 400);
    }

    const { data: post, error: postError } = await admin
      .from("telegram_posts")
      .select("id, user_id, channel_id, status, content, image_url, scheduled_time")
      .eq("id", postId)
      .maybeSingle();

    if (postError || !post) {
      return jsonResponse({ error: "Post not found" }, 404);
    }

    let channelUserId: string | null = null;
    let chatId: string | null = null;
    let channelBotToken: string | null = null;

    if (post.channel_id) {
      const { data: channel, error: channelError } = await admin
        .from("channels")
        .select("id, user_id, telegram_channel_id, telegram_bot_token")
        .eq("id", post.channel_id)
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
        postUserId: post.user_id,
        channelUserId,
        isSuperAdmin,
      });
      if (!allowed) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    }

    if (!instantPost && post.status !== "scheduled") {
      return jsonResponse({ error: "Post is not scheduled" }, 409);
    }
    if (instantPost && post.status !== "draft" && post.status !== "scheduled") {
      return jsonResponse({ error: "Post cannot be sent in its current state" }, 409);
    }

    workerId = crypto.randomUUID();
    previousStatus = post.status;

    const { data: claimed, error: claimError } = await admin.rpc("claim_telegram_post_for_dispatch", {
      p_post_id: postId,
      p_user_id: isInternal ? null : callerUserId,
      p_worker_id: workerId,
      p_allow_scheduled: true,
    });

    if (claimError) {
      console.error("claim_telegram_post_for_dispatch failed:", claimError.message);
      return jsonResponse({ error: "Unable to claim post" }, 409);
    }
    if (!claimed || claimed.length === 0) {
      return jsonResponse({ error: "Post is already being sent or is not sendable" }, 409);
    }

    claimedPostId = postId;

    const globalToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    let botToken = channelBotToken || null;
    if (!botToken && post.user_id) {
      const { data: botChannel } = await admin
        .from("channels")
        .select("telegram_bot_token")
        .eq("user_id", post.user_id)
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

    const baseUrl = `https://api.telegram.org/bot${botToken}`;
    let sendResult;

    if (post.image_url) {
      sendResult = await telegramRequest(`${baseUrl}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: post.image_url,
          caption: truncate(markdownToHtml(post.content || ""), 1024),
          parse_mode: "HTML",
        }),
      });
    } else {
      sendResult = await telegramRequest(`${baseUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: truncate(markdownToHtml(post.content || ""), 4096),
          parse_mode: "HTML",
        }),
      });
    }

    if (sendResult.kind !== "success") {
      const error = new Error(sendResult.description || "Failed to send post") as Error & { telegramKind?: string };
      error.telegramKind = sendResult.kind;
      throw error;
    }

    const messageId = (sendResult.body as { result?: { message_id?: number } } | null)?.result?.message_id?.toString() || null;
    const { data: completed, error: completeError } = await admin.rpc("complete_telegram_post", {
      p_id: postId,
      p_worker_id: workerId,
      p_status: "posted",
      p_message_id: messageId,
      p_chat_id: String(chatId),
    });

    if (completeError || completed !== true) {
      console.error("Failed to record posted status:", completeError);
      return jsonResponse({
        success: true,
        message: "Post sent to Telegram, but status could not be recorded",
        messageId,
      }, 200);
    }

    return jsonResponse({
      success: true,
      message: "Post sent successfully to Telegram",
      messageId,
    });
  } catch (error) {
    console.error("Error sending post:", error);
    const kind = (error as { telegramKind?: string }).telegramKind;
    const ambiguous = kind === "timeout" || kind === "network" || kind === "ambiguous" || kind === "rate_limited";

    if (claimedPostId && workerId) {
      const releaseStatus = ambiguous ? (previousStatus === "scheduled" ? "scheduled" : "draft") : "failed";
      const { error: completeError } = await admin.rpc("complete_telegram_post", {
        p_id: claimedPostId,
        p_worker_id: workerId,
        p_status: releaseStatus,
        p_error: ambiguous ? "ambiguous_send_timeout" : publicErrorMessage(error, "Failed to send post"),
      });
      if (completeError) {
        console.error("Failed to record send failure:", completeError);
      }
    }

    return jsonResponse({
      error: publicErrorMessage(error, "Failed to send post"),
    }, 500);
  }
});
