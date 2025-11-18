import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendPostRequest {
  postId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId }: SendPostRequest = await req.json();

    if (!postId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: postId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch post details
    const { data: post, error: postError } = await supabase
      .from("channel_posts")
      .select(
        `
        *,
        channel:channels(telegram_channel_id, telegram_bot_token)
      `
      )
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw new Error("Post not found");
    }

    const channel = post.channel as any;
    const botToken = channel.telegram_bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = channel.telegram_channel_id;

    if (!botToken || !chatId) {
      throw new Error(
        "Telegram bot token or chat ID not configured for this channel"
      );
    }

    const baseUrl = `https://api.telegram.org/bot${botToken}`;
    let messageId: string | undefined;

    // Send based on post type
    switch (post.post_type) {
      case "text": {
        const response = await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: post.content,
            parse_mode: post.parse_mode || "HTML",
            reply_markup: post.formatting_options?.inline_keyboard
              ? { inline_keyboard: post.formatting_options.inline_keyboard }
              : undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(`Telegram API error: ${data.description}`);
        }
        messageId = data.result.message_id;
        break;
      }

      case "image": {
        const response = await fetch(`${baseUrl}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: post.media_url,
            caption: post.content,
            parse_mode: post.parse_mode || "HTML",
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(`Telegram API error: ${data.description}`);
        }
        messageId = data.result.message_id;
        break;
      }

      case "poll": {
        const pollData = post.poll_data as any;
        const response = await fetch(`${baseUrl}/sendPoll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            question: pollData.question,
            options: pollData.options.map((opt: any) => opt.text),
            is_anonymous: pollData.is_anonymous ?? true,
            allows_multiple_answers: pollData.allows_multiple_answers ?? false,
            type: pollData.correct_option_id !== undefined ? "quiz" : "regular",
            correct_option_id: pollData.correct_option_id,
            explanation: pollData.explanation,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(`Telegram API error: ${data.description}`);
        }
        messageId = data.result.message_id;
        break;
      }

      case "pdf": {
        const response = await fetch(`${baseUrl}/sendDocument`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            document: post.media_url,
            caption: post.content,
            parse_mode: "HTML",
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(`Telegram API error: ${data.description}`);
        }
        messageId = data.result.message_id;
        break;
      }

      case "promotional": {
        const response = await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: post.content,
            parse_mode: post.parse_mode || "HTML",
            reply_markup: post.formatting_options?.inline_keyboard
              ? { inline_keyboard: post.formatting_options.inline_keyboard }
              : undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(`Telegram API error: ${data.description}`);
        }
        messageId = data.result.message_id;
        break;
      }

      case "quiz": {
        const quizData = post.quiz_data as any;

        // Send intro message
        await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `📚 Topic: ${quizData.topic}\n\n🎯 Quiz Time! Answer the questions below:`,
            parse_mode: "Markdown",
          }),
        });

        // Send each question as a quiz poll
        for (let i = 0; i < quizData.questions.length; i++) {
          const question = quizData.questions[i];

          const pollResponse = await fetch(`${baseUrl}/sendPoll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              question: `Q${i + 1}: ${question.question}`,
              options: question.options,
              type: "quiz",
              correct_option_id: question.correct_option_index,
              explanation: question.explanation || "Check the answer!",
              is_anonymous: true,
            }),
          });

          const pollData = await pollResponse.json();
          if (!pollResponse.ok) {
            throw new Error(
              `Failed to send quiz question ${i + 1}: ${pollData.description}`
            );
          }

          // Store the first message ID
          if (i === 0) {
            messageId = pollData.result.message_id;
          }

          // Small delay between questions
          if (i < quizData.questions.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        break;
      }

      default:
        throw new Error(`Unsupported post type: ${post.post_type}`);
    }

    // Update post status
    const { error: updateError } = await supabase
      .from("channel_posts")
      .update({
        status: "published",
        sent_at: new Date().toISOString(),
        telegram_message_id: messageId,
        error_message: null,
      })
      .eq("id", postId);

    if (updateError) {
      console.error("Failed to update post status:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Post sent successfully`,
        message_id: messageId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending channel post:", error);

    // Try to update post status to failed
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { postId } = await req.json();

      await supabase
        .from("channel_posts")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", postId);
    } catch (updateError) {
      console.error("Failed to update post status:", updateError);
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
