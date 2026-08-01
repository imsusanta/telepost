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

    {
        const cronSecret = Deno.env.get("CRON_SECRET");
        const provided = req.headers.get("x-cron-secret");
        const authHeader = req.headers.get("Authorization");
        let allowed = !!(cronSecret && provided && provided === cronSecret);
        if (!allowed && authHeader?.startsWith("Bearer ")) {
            try {
                const tmp = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
                const { data } = await tmp.auth.getUser(authHeader.replace("Bearer ", ""));
                if (data?.user) allowed = true;
            } catch { /* ignore */ }
        }
        if (!allowed) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }

    try {
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        const now = new Date().toISOString();

        // Fetch posts that are scheduled and due for posting
        const { data: posts, error: fetchError } = await supabaseAdmin
            .from('telegram_posts')
            .select(`
                *,
                channels (
                    telegram_channel_id,
                    telegram_bot_token
                )
            `)
            .eq('status', 'scheduled')
            .lte('scheduled_time', now)
            .order('scheduled_time', { ascending: true })
            .limit(50);

        if (fetchError) {
            console.error('Error fetching scheduled posts:', fetchError);
            return new Response(
                JSON.stringify({ error: 'Failed to fetch scheduled posts' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!posts || posts.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No scheduled posts to process",
                    processed: 0,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Processing ${posts.length} scheduled posts...`);

        let successCount = 0;
        let failedCount = 0;
        const results = [];

        // Get global bot token fallback
        const GLOBAL_TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

        // Process each scheduled post
        for (const post of posts) {
            try {
                let TELEGRAM_BOT_TOKEN: string | null = null;

                // 1. Try to get token from the specific channel linked to the post
                if (post.channels?.telegram_bot_token) {
                    TELEGRAM_BOT_TOKEN = post.channels.telegram_bot_token;
                    console.log(`Using bot token from channel for post ${post.id}`);
                }

                // 2. Fallback: Search for any bot token owned by the user
                if (!TELEGRAM_BOT_TOKEN && post.user_id) {
                    const { data: botChannel } = await supabaseAdmin
                        .from('channels')
                        .select('telegram_bot_token')
                        .eq('user_id', post.user_id)
                        .not('telegram_bot_token', 'is', null)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (botChannel?.telegram_bot_token) {
                        TELEGRAM_BOT_TOKEN = botChannel.telegram_bot_token;
                        console.log(`Using fallback bot token from user ${post.user_id}'s channels`);
                    }
                }

                // 3. Fallback: Use global token
                if (!TELEGRAM_BOT_TOKEN) {
                    TELEGRAM_BOT_TOKEN = GLOBAL_TELEGRAM_BOT_TOKEN;
                    if (TELEGRAM_BOT_TOKEN) {
                        console.log("Using global bot token (last resort)");
                    }
                }

                if (!TELEGRAM_BOT_TOKEN) {
                    throw new Error("No bot token available for this post.");
                }

                const chatId = post.channels?.telegram_channel_id;
                if (!chatId) {
                    throw new Error("Chat ID not configured for this post.");
                }

                const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

                // Truncate helper
                const truncate = (str: string, limit: number): string => {
                    if (!str) return "";
                    return str.length > limit ? str.substring(0, limit - 3) + "..." : str;
                };

                // Helper to send Telegram requests with retry logic for 429 errors
                async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
                    let retries = 0;
                    while (retries < maxRetries) {
                        const response = await fetch(url, options);
                        if (response.status === 429) {
                            const data = await response.json();
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

                let messageId: string | null = null;
                let postSuccess = false;

                // Send post based on content type
                if (post.image_url) {
                    console.log(`Sending photo to ${chatId} for post ${post.id}...`);
                    const photoResponse = await fetchWithRetry(`${baseUrl}/sendPhoto`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            photo: post.image_url,
                            caption: truncate(post.content || "", 1024),
                            parse_mode: "Markdown",
                        }),
                    });

                    const photoData = await photoResponse.json();
                    if (!photoResponse.ok) throw new Error(photoData.description || "Failed to send photo");
                    messageId = photoData.result?.message_id?.toString();
                    postSuccess = true;
                } else {
                    console.log(`Sending text message to ${chatId} for post ${post.id}...`);
                    const messageResponse = await fetchWithRetry(`${baseUrl}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: truncate(post.content, 4096),
                            parse_mode: "Markdown",
                        }),
                    });

                    const messageData = await messageResponse.json();
                    if (!messageResponse.ok) throw new Error(messageData.description || "Failed to send message");
                    messageId = messageData.result?.message_id?.toString();
                    postSuccess = true;
                }

                if (postSuccess) {
                    // Update post status to posted
                    await supabaseAdmin
                        .from('telegram_posts')
                        .update({
                            status: 'posted',
                            posted_at: new Date().toISOString(),
                            telegram_message_id: messageId,
                            telegram_chat_id: chatId.toString(),
                        })
                        .eq('id', post.id);

                    successCount++;
                    results.push({ id: post.id, status: 'success' });
                }

                // Small delay to avoid hitting rate limits too fast in a loop
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Failed to process post ${post.id}:`, errorMessage);

                // Update post with error
                await supabaseAdmin
                    .from('telegram_posts')
                    .update({
                        status: 'failed',
                        error_message: errorMessage,
                    })
                    .eq('id', post.id);

                failedCount++;
                results.push({ id: post.id, status: 'failed', error: errorMessage });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: posts.length,
                successful: successCount,
                failed: failedCount,
                results,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error in process-scheduled-telegram-posts:", error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
