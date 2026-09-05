import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { classifyBearer, extractBearer, publicErrorMessage } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { alreadySentPoll, isAmbiguousOutcome, telegramRequest } from "../_shared/telegram.ts";

const TELEGRAM_API_ORIGIN = "https://api.telegram.org";

function safeTruncate(strValue: string, limit: number): string {
  if (!strValue) return "";
  const chars = Array.from(strValue);
  if (chars.length <= limit) return strValue;
  return chars.slice(0, limit - 3).join("") + "...";
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

  let reqBody: {
    force?: boolean;
    triggered_by?: string;
    post_ids?: string[];
    send_now?: boolean;
  } = {};
  try {
    reqBody = await req.clone().json();
  } catch {
    reqBody = {};
  }

  // Ordinary users cannot run global processing or administrative repair.
  if (!isInternal && reqBody?.triggered_by === "repair") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const workerId = crypto.randomUUID();
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (isInternal) {
      const { error: recoverError } = await admin.rpc("recover_scheduler_jobs");
      if (recoverError) {
        console.warn("recover_scheduler_jobs failed:", recoverError.message);
      }
    }

    let pendingPosts: Array<Record<string, unknown>> = [];

    if (!isInternal && Array.isArray(reqBody.post_ids) && reqBody.post_ids.length > 0 && reqBody.send_now === true) {
      const { data: claimed, error: claimError } = await admin.rpc("claim_scheduled_posts_by_ids", {
        p_ids: reqBody.post_ids,
        p_user_id: callerUserId,
        p_worker_id: workerId,
      });
      if (claimError) {
        console.error("claim_scheduled_posts_by_ids failed:", claimError.message);
        return jsonResponse({ error: "Unable to claim posts" }, 500);
      }
      pendingPosts = claimed || [];
    } else {
      const { data: claimed, error: claimError } = await admin.rpc("claim_due_scheduled_posts", {
        p_user_id: isInternal ? null : callerUserId,
        p_limit: 5,
        p_worker_id: workerId,
      });
      if (claimError) {
        console.error("claim_due_scheduled_posts failed:", claimError.message);
        return jsonResponse({ error: "Unable to claim due posts" }, 500);
      }
      pendingPosts = claimed || [];
    }

    if (pendingPosts.length === 0) {
      return jsonResponse({
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        message: "No pending posts to process",
        now: new Date().toISOString(),
      });
    }

    const globalToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const results: Array<Record<string, unknown>> = [];

    for (const post of pendingPosts) {
      const postId = String(post.id);
      try {
        let channelQuery = admin.from("channels").select("telegram_bot_token, name, user_id");
        if (post.channel_id) channelQuery = channelQuery.eq("id", post.channel_id);
        else channelQuery = channelQuery.eq("telegram_channel_id", post.chat_id);
        const { data: channel, error: channelError } = await channelQuery.maybeSingle();
        if (channelError) {
          console.error(`Error fetching channel for post ${postId}:`, channelError);
        }

        if (!isInternal && channel?.user_id && channel.user_id !== callerUserId && post.user_id !== callerUserId) {
          throw new Error("Forbidden");
        }

        const botToken = channel?.telegram_bot_token || globalToken;
        if (!botToken) {
          throw Object.assign(new Error("No bot token available for this channel."), { telegramKind: "definitive_failure" });
        }

        const baseUrl = `${TELEGRAM_API_ORIGIN}/bot${botToken}`;
        let chatId = String(post.chat_id || "");
        if (chatId && !chatId.startsWith("@") && !chatId.startsWith("-100")) {
          const numericId = chatId.replace(/^-/, "");
          if (/^\d+$/.test(numericId)) chatId = `-100${numericId}`;
        }

        const quizData = post.quiz_data as {
          questions?: Array<Record<string, unknown>>;
          topic?: string;
          metadata?: { language?: string };
          language?: string;
        } | null;
        if (!quizData?.questions) {
          throw Object.assign(new Error("Invalid quiz data: Missing questions"), { telegramKind: "definitive_failure" });
        }

        const progress = (post.delivery_progress || {}) as {
          intro_sent?: boolean;
          polls_sent?: number[];
        };

        const storedLanguage = quizData?.metadata?.language || quizData?.language || "";
        const hasBengaliText = storedLanguage === "bn" || storedLanguage === "Bengali" ||
          quizData.questions.some((q) => /[\u0980-\u09FF]/.test(String(q.question || "")));
        const hasHindiText = storedLanguage === "hi" || storedLanguage === "Hindi" ||
          (!hasBengaliText && quizData.questions.some((q) => /[\u0900-\u097F]/.test(String(q.question || ""))));

        const introText = hasBengaliText
          ? `📝 *কুইজ: ${quizData.topic || "সাধারণ"}*\n\n📊 আপনার জন্য ${quizData.questions.length}টি প্রশ্ন! নীচের প্রশ্নগুলির উত্তর দিন:`
          : hasHindiText
            ? `📝 *क्विज़: ${quizData.topic || "सामान्य"}*\n\n📊 आपके लिए ${quizData.questions.length} प्रश्न! नीचे दिए गए प्रश्नों के उत्तर दें:`
            : `📝 *Quiz: ${quizData.topic || "General"}*\n\n📊 ${quizData.questions.length} questions for you! Answer the questions below:`;

        if (!progress.intro_sent) {
          const introResponse = await telegramRequest(`${baseUrl}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: introText, parse_mode: "Markdown" }),
          });
          if (introResponse.kind !== "success") {
            throw Object.assign(new Error(introResponse.description || "Failed to send intro"), {
              telegramKind: introResponse.kind,
            });
          }
          progress.intro_sent = true;
          const { data: recorded, error: progressError } = await admin.rpc("record_scheduled_post_progress", {
            p_id: postId,
            p_worker_id: workerId,
            p_progress: progress,
          });
          if (progressError || recorded !== true) {
            throw new Error("Failed to record delivery progress");
          }
        }

        progress.polls_sent = Array.isArray(progress.polls_sent) ? progress.polls_sent : [];

        for (let i = 0; i < quizData.questions.length; i++) {
          if (alreadySentPoll(progress, i)) continue;

          const q = quizData.questions[i];
          const questionCharCount = Array.from(String(q.question || "")).length;
          const requiresFallback = questionCharCount > 200;
          const pollQuestion = requiresFallback
            ? safeTruncate(`Q${i + 1}: Select the correct answer:`, 200)
            : safeTruncate(`Q${i + 1}: ${q.question}`, 200);

          if (requiresFallback) {
            const fallback = await telegramRequest(`${baseUrl}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: safeTruncate(`*Question ${i + 1}:*\n${q.question}`, 4000),
                parse_mode: "Markdown",
              }),
            });
            if (fallback.kind !== "success") {
              throw Object.assign(new Error(fallback.description || "Failed to send question text"), {
                telegramKind: fallback.kind,
              });
            }
          }

          let pollOptions = (Array.isArray(q.options) ? q.options : [])
            .slice(0, 10)
            .map((opt) => safeTruncate(String(opt || "Option"), 80))
            .filter((opt) => opt.length > 0);
          while (pollOptions.length < 2) pollOptions.push("Option " + (pollOptions.length + 1));

          const correctIndex = Number.parseInt(String(q.correct_option_index), 10);
          const safeCorrectIndex =
            Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < pollOptions.length
              ? correctIndex
              : 0;

          const pollResponse = await telegramRequest(`${baseUrl}/sendPoll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              question: pollQuestion,
              options: pollOptions,
              type: "quiz",
              correct_option_id: safeCorrectIndex,
              explanation: safeTruncate(String(q.explanation || "Correct"), 150),
              is_anonymous: true,
            }),
          });

          if (pollResponse.kind !== "success") {
            throw Object.assign(new Error(pollResponse.description || "Failed to send poll"), {
              telegramKind: pollResponse.kind,
            });
          }

          progress.polls_sent.push(i);
          const { data: recorded, error: progressError } = await admin.rpc("record_scheduled_post_progress", {
            p_id: postId,
            p_worker_id: workerId,
            p_progress: progress,
          });
          if (progressError || recorded !== true) {
            throw new Error("Failed to record delivery progress");
          }

          if (i < quizData.questions.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        const { data: completed, error: completeError } = await admin.rpc("complete_scheduled_post", {
          p_id: postId,
          p_worker_id: workerId,
          p_status: "sent",
        });
        if (completeError || completed !== true) {
          throw new Error("Failed to record sent status");
        }
        results.push({ id: postId, status: "sent" });
      } catch (error) {
        const kind = (error as { telegramKind?: string }).telegramKind;
        const ambiguous = kind ? isAmbiguousOutcome(kind as "timeout") : false;
        const status = ambiguous ? "pending" : "failed";
        const { error: completeError } = await admin.rpc("complete_scheduled_post", {
          p_id: postId,
          p_worker_id: workerId,
          p_status: status,
          p_error: publicErrorMessage(error, "Unknown error"),
        });
        if (completeError) {
          console.error(`Failed to record ${status} for ${postId}:`, completeError);
        }
        results.push({
          id: postId,
          status,
          error: publicErrorMessage(error, "Unknown error"),
          ambiguous,
        });
      }
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return jsonResponse({
      success: true,
      processed: results.length,
      sent: sentCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error("Error processing scheduled posts:", error);
    return jsonResponse({
      success: false,
      error: publicErrorMessage(error, "Unable to process scheduled posts"),
      processed: 0,
      sent: 0,
      failed: 0,
    }, 500);
  }
});
