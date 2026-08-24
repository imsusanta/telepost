import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // --- AUTH GATE ---
  // Accepts, in order: the cron shared secret, the service role key (this is
  // what pg_cron and internal dispatches send), or a signed-in user's JWT.
  //
  // Previously the service role key was only checked with auth.getUser(), which
  // always fails for a service role JWT because it has no user attached, so
  // every cron run was rejected with 401 and nothing was ever sent.
  {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    let allowed = !!(cronSecret && providedSecret && providedSecret === cronSecret);

    if (!allowed && bearer && supabaseKey && bearer === supabaseKey) {
      allowed = true;
    }

    if (!allowed && bearer) {
      try {
        const tmp = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data } = await tmp.auth.getUser(bearer);
        if (data?.user) allowed = true;
      } catch { /* ignore */ }
    }

    if (!allowed) {
      console.warn("[process-scheduled-posts] Unauthorized invocation rejected.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- SELF-REPAIR CONFIGURATION BLOCK ---
    // Keeps system_config in sync so the pg_cron workers can build the
    // function URL and authenticate.
    const repairSecret = req.headers.get("X-Telepost-Repair-Secret");
    const isRepairRequest = repairSecret === "fix-my-config-2026";

    try {
      const { data: configData } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['supabase_url', 'supabase_service_role_key']);

      const currentKey = configData?.find(c => c.key === 'supabase_service_role_key')?.value;
      const currentUrl = configData?.find(c => c.key === 'supabase_url')?.value;

      const needsRepair = !configData || configData.length < 2 ||
        isRepairRequest ||
        currentUrl !== supabaseUrl ||
        (currentKey && !currentKey.includes('.'));

      if (needsRepair) {
        console.log(`Self-repairing system_config entries... (Request: ${isRepairRequest})`);
        await supabase.rpc('set_system_config', {
          config_key: 'supabase_url',
          config_value: supabaseUrl,
          config_description: 'Supabase project URL for calling edge functions'
        });
        await supabase.rpc('set_system_config', {
          config_key: 'supabase_service_role_key',
          config_value: supabaseKey,
          config_description: 'Supabase service role key for authenticating edge function calls'
        });
        console.log("system_config restoration complete.");

        if (isRepairRequest) {
          return new Response(JSON.stringify({ message: "Configuration repaired successfully" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (repairError) {
      console.error("Self-repair of system_config failed:", repairError);
    }
    // ----------------------------------------

    const GLOBAL_TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_API_ORIGIN = 'https:' + '//api.telegram.org';

    // Read body parameters if provided
    let reqBody: any = {};
    try {
      reqBody = await req.clone().json();
    } catch (_) {
      reqBody = {};
    }

    const isForce = reqBody?.force === true || reqBody?.triggered_by === 'manual';

    // Safety Catch-Up: Reset stuck processing posts (> 5 minutes old) back to pending
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabase
      .from('scheduled_telegram_posts')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('status', 'processing')
      .lt('updated_at', fiveMinsAgo);

    // Atomically claim pending posts that are due
    let pendingPosts: any[] = [];

    // Try RPC claim first
    try {
      const { data: claimedRpc, error: rpcError } = await supabase.rpc('claim_due_scheduled_posts');
      if (!rpcError && claimedRpc && claimedRpc.length > 0) {
        pendingPosts = claimedRpc;
      } else if (rpcError) {
        console.warn("[process-scheduled-posts] RPC claim_due_scheduled_posts failed:", rpcError.message);
      }
    } catch (e) {
      console.warn("[process-scheduled-posts] RPC exception, falling back to direct DB claim:", e);
    }

    // Fallback: If RPC returned nothing or failed, query pending posts directly
    if (pendingPosts.length === 0) {
      // Look for pending posts that are due (with a 2-minute buffer for clock/timezone drift)
      // Or all pending posts if force/manual trigger
      const dueThreshold = isForce
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 2 * 60 * 1000).toISOString();

      const { data: fallbackPosts, error: fallbackError } = await supabase
        .from('scheduled_telegram_posts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_time', dueThreshold)
        .order('scheduled_time', { ascending: true })
        .limit(10);

      if (fallbackError) {
        console.error("Fallback query error:", fallbackError);
        throw fallbackError;
      }

      if (fallbackPosts && fallbackPosts.length > 0) {
        const ids = fallbackPosts.map((p: any) => p.id);
        await supabase
          .from('scheduled_telegram_posts')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .in('id', ids);
        pendingPosts = fallbackPosts;
      }
    }

    console.log(`[process-scheduled-posts] Found and claimed ${pendingPosts?.length || 0} pending posts to process at ${new Date().toISOString()}`);

    if (!pendingPosts || pendingPosts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          sent: 0,
          failed: 0,
          message: "No pending posts to process",
          now: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const post of pendingPosts || []) {
      try {
        // Fetch channel-specific bot token
        // Use channel_id primarily if available, otherwise fallback to chat_id
        let channelQuery = supabase.from('channels').select('telegram_bot_token, name');

        if (post.channel_id) {
          channelQuery = channelQuery.eq('id', post.channel_id);
        } else {
          channelQuery = channelQuery.eq('telegram_channel_id', post.chat_id);
        }

        const { data: channel, error: channelError } = await channelQuery.maybeSingle();

        if (channelError) {
          console.error(`Error fetching channel for post ${post.id}:`, channelError);
        }

        // Use channel-specific token, fallback to global token
        const botToken = channel?.telegram_bot_token || GLOBAL_TELEGRAM_BOT_TOKEN;

        if (!botToken) {
          throw new Error(`No bot token available for chat_id: ${post.chat_id}. Please configure a bot token in channel settings or set TELEGRAM_BOT_TOKEN environment variable.`);
        }

        console.log(`Processing post ${post.id} for chat ${post.chat_id} using ${channel?.telegram_bot_token ? 'channel-specific' : 'global'} bot token`);

        const baseUrl = `${TELEGRAM_API_ORIGIN}/bot${botToken}`;

        // Normalize chat ID - add -100 prefix for channels/supergroups if needed
        let chatId = String(post.chat_id || '');
        if (chatId && !chatId.startsWith('@') && !chatId.startsWith('-100')) {
          const numericId = chatId.replace(/^-/, '');
          if (/^\d+$/.test(numericId)) {
            chatId = `-100${numericId}`;
          }
        }

        // Helper to send Telegram requests with retry logic for 429 errors
        async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
          let retries = 0;
          while (retries < maxRetries) {
            const response = await fetch(url, options);
            if (response.status === 429) {
              const data = await response.json() as any;
              const retryAfter = (data.parameters?.retry_after || 5) * 1000;
              console.warn(`Rate limited by Telegram. Retrying after ${retryAfter}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryAfter));
              retries++;
              continue;
            }
            return response;
          }
          return fetch(url, options); // Final attempt
        }

        if (!post.quiz_data || !post.quiz_data.questions) {
          throw new Error("Invalid quiz data: Missing questions");
        }

        // Detect quiz language from metadata or from text script
        const storedLanguage = post.quiz_data?.metadata?.language || post.quiz_data?.language || '';
        const hasBengaliText = storedLanguage === 'bn' || storedLanguage === 'Bengali' || post.quiz_data.questions.some((q: any) =>
          /[\u0980-\u09FF]/.test(q.question || '')
        );
        const hasHindiText = storedLanguage === 'hi' || storedLanguage === 'Hindi' || (!hasBengaliText && post.quiz_data.questions.some((q: any) =>
          /[\u0900-\u097F]/.test(q.question || '')
        ));

        // Language-aware intro message
        const introText = hasBengaliText
          ? `📝 *কুইজ: ${post.quiz_data.topic || "সাধারণ"}*\n\n📊 আপনার জন্য ${post.quiz_data.questions.length}টি প্রশ্ন! নীচের প্রশ্নগুলির উত্তর দিন:`
          : hasHindiText
            ? `📝 *क्विज़: ${post.quiz_data.topic || "सामान्य"}*\n\n📊 आपके लिए ${post.quiz_data.questions.length} प्रश्न! नीचे दिए गए प्रश्नों के उत्तर दें:`
            : `📝 *Quiz: ${post.quiz_data.topic || "General"}*\n\n📊 ${post.quiz_data.questions.length} questions for you! Answer the questions below:`;

        // Send intro message
        console.log(`[Post ${post.id}] Sending intro message to ${chatId}`);
        const introResponse = await fetchWithRetry(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: introText,
            parse_mode: "Markdown",
          }),
        });

        if (!introResponse.ok) {
          const introData = await introResponse.json() as any;
          console.error(`Failed to send intro message:`, introData);
          throw new Error(`Bot access error: ${introData.description || "Failed to send message"}.`);
        }

        // Send each question as a poll
        // Safe truncate for multi-byte characters (Bengali/emoji)
        const safeTruncate = (strValue: string, limit: number): string => {
          if (!strValue) return "";
          const chars = Array.from(strValue);
          if (chars.length <= limit) return strValue;
          return chars.slice(0, limit - 3).join("") + "...";
        };

        for (let i = 0; i < post.quiz_data.questions.length; i++) {
          const q = post.quiz_data.questions[i];

          // Telegram Poll Limits: Question 300, Options 100, Explanation 200
          const questionCharCount = Array.from(q.question || "").length;
          const requiresFallback = questionCharCount > 200;
          const pollQuestion = requiresFallback
            ? safeTruncate(`Q${i + 1}: Select the correct answer:`, 200)
            : safeTruncate(`Q${i + 1}: ${q.question}`, 200);

          if (requiresFallback) {
            // Send the full question text as a message first
            await fetchWithRetry(`${baseUrl}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: safeTruncate(`*Question ${i + 1}:*\n${q.question}`, 4000),
                parse_mode: "Markdown",
              }),
            });
          }

          // Ensure options are valid and truncated
          let pollOptions = (q.options || [])
            .slice(0, 10) // Max 10 options
            .map(opt => safeTruncate(String(opt || "Option"), 80))
            .filter(opt => opt.length > 0);

          while (pollOptions.length < 2) {
            pollOptions.push("Option " + (pollOptions.length + 1));
          }

          const correctIndex = Number.parseInt(String(q.correct_option_index), 10);
          const safeCorrectIndex = Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < pollOptions.length
            ? correctIndex
            : 0;

          const pollExplanation = safeTruncate(q.explanation || "Correct", 150);
          console.log(`[Post ${post.id}] Sending poll for question ${i + 1}/${post.quiz_data.questions.length}`);
          const pollResponse = await fetchWithRetry(`${baseUrl}/sendPoll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              question: pollQuestion,
              options: pollOptions,
              type: "quiz",
              correct_option_id: safeCorrectIndex,
              explanation: pollExplanation,
              is_anonymous: true,
            }),
          });

          if (!pollResponse.ok) {
            const pollData = (await pollResponse.json().catch(() => ({ description: "Failed to parse error response" }))) as any;
            console.error(`[Post ${post.id}] Failed to send poll ${i + 1}:`, pollData);
            throw new Error(`Failed to send poll: ${pollData.description || "Unknown error"}`);
          }
          console.log(`[Post ${post.id}] Poll ${i + 1} sent successfully`);

          // Delay between polls to avoid rate limiting
          if (i < post.quiz_data.questions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // Update post as sent
        await supabase
          .from('scheduled_telegram_posts')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'failed', error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        sent: sentCount,
        failed: failedCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing scheduled posts:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error processing scheduled posts",
        processed: 0,
        sent: 0,
        failed: 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
