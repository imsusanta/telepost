import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    // Get all pending posts that are due
    const { data: pendingPosts, error: fetchError } = await supabase
      .from('scheduled_telegram_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching scheduled posts:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingPosts?.length || 0} pending posts to process`);

    const results = [];
    
    for (const post of pendingPosts || []) {
      try {
        const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        
        // Send intro message
        await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: post.chat_id,
            text: `🎯 *${post.quiz_data.topic} Quiz*\n\nHere are ${post.quiz_data.questions.length} questions for you! Answer the polls below:`,
            parse_mode: "Markdown",
          }),
        });

        // Send each question as a poll
        for (let i = 0; i < post.quiz_data.questions.length; i++) {
          const question = post.quiz_data.questions[i];
          
          const pollResponse = await fetch(`${baseUrl}/sendPoll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: post.chat_id,
              question: `Q${i + 1}: ${question.question}`,
              options: question.options,
              type: "quiz",
              correct_option_id: question.correct_option_index,
              explanation: question.explanation || "Check the answer!",
              is_anonymous: true,
            }),
          });

          if (!pollResponse.ok) {
            const pollData = await pollResponse.json();
            throw new Error(`Failed to send poll: ${pollData.description || "Unknown error"}`);
          }
          
          // Small delay between polls
          if (i < post.quiz_data.questions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Update post as sent
        await supabase
          .from('scheduled_telegram_posts')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'sent' });
        console.log(`Successfully sent scheduled post ${post.id}`);

      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
        
        // Update post as failed
        await supabase
          .from('scheduled_telegram_posts')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'failed', error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing scheduled posts:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
