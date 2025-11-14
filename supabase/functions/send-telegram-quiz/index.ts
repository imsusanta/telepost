import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramQuizRequest {
  chatId: string;
  quiz: {
    topic: string;
    questions: Array<{
      question: string;
      options: string[];
      correct_option_index: number;
      explanation?: string;
    }>;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, quiz }: TelegramQuizRequest = await req.json();
    
    if (!chatId || !quiz || !quiz.questions) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: chatId and quiz" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    
    // Send intro message
    await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🎯 *${quiz.topic} Quiz*\n\nHere are ${quiz.questions.length} questions for you! Answer the polls below:`,
        parse_mode: "Markdown",
      }),
    });

    // Send each question as a poll
    const results = [];
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      
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
        console.error(`Failed to send poll ${i + 1}:`, pollData);
        
        // Provide specific error messages for common issues
        if (pollData.error_code === 403) {
          throw new Error(`Bot Access Error: Your bot is not a member of this chat. Please:\n1. Open Telegram and go to @${chatId.replace('@', '')}\n2. Add your bot as an Administrator\n3. Grant it 'Post Messages' permission\n4. Try again`);
        } else if (pollData.error_code === 400 && pollData.description?.includes('chat not found')) {
          throw new Error(`Chat Not Found: The chat ID "${chatId}" doesn't exist or is incorrect. Make sure to use the correct format:\n- For channels: @channelname or -100xxxxxxxxxx\n- For groups: -xxxxxxxxx\n- For personal chats: positive number`);
        }
        
        throw new Error(`Failed to send poll: ${pollData.description || "Unknown error"}`);
      }
      
      results.push(pollData);
      
      // Small delay between polls to avoid rate limiting
      if (i < quiz.questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Successfully sent ${results.length} polls to chat ${chatId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${results.length} quiz polls to Telegram`,
        pollsSent: results.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending Telegram quiz:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Make sure your bot token is correct and the chat_id is valid. The bot must be added to the chat/channel."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});