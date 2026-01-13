import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramPostRequest {
    postId: string;
    instantPost?: boolean;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    let currentPostId: string | null = null;

    try {
        const body = await req.json();
        const { postId, instantPost = false }: TelegramPostRequest = body;
        currentPostId = postId;

        if (!postId) {
            return new Response(
                JSON.stringify({ error: "Missing required field: postId" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch post data with channel info
        const { data: post, error: postError } = await supabase
            .from('telegram_posts')
            .select(`
                *,
                channels (
                    telegram_channel_id,
                    telegram_bot_token,
                    user_id
                )
            `)
            .eq('id', postId)
            .single();

        if (postError || !post) {
            console.error(`Post ${postId} not found:`, postError);
            throw new Error(`Post not found: ${postError?.message || "Unknown error"}`);
        }

        // Check if post is ready
        if (!instantPost && post.status !== 'scheduled') {
            throw new Error(`Post status must be 'scheduled' to post (current: ${post.status})`);
        }

        if (instantPost && post.status !== 'draft' && post.status !== 'scheduled') {
            throw new Error(`Can only instantly post with 'draft' or 'scheduled' status (current: ${post.status})`);
        }

        // Truncate helper
        const truncate = (str: string, limit: number): string => {
            if (!str) return "";
            return str.length > limit ? str.substring(0, limit - 3) + "..." : str;
        };

        // Get bot token
        const GLOBAL_TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
        let TELEGRAM_BOT_TOKEN: string | null = null;

        // 1. Try channel's bot token
        if (post.channels?.telegram_bot_token) {
            TELEGRAM_BOT_TOKEN = post.channels.telegram_bot_token;
            console.log(`Using bot token from channel`);
        }

        // 2. Fallback: Search for any bot token owned by the user
        if (!TELEGRAM_BOT_TOKEN && post.user_id) {
            const { data: botChannel } = await supabase
                .from('channels')
                .select('telegram_bot_token')
                .eq('user_id', post.user_id)
                .not('telegram_bot_token', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (botChannel?.telegram_bot_token) {
                TELEGRAM_BOT_TOKEN = botChannel.telegram_bot_token;
                console.log(`Using fallback bot token from user's channels`);
            }
        }

        // 3. Fallback: Use global token
        if (!TELEGRAM_BOT_TOKEN) {
            TELEGRAM_BOT_TOKEN = GLOBAL_TELEGRAM_BOT_TOKEN;
            if (TELEGRAM_BOT_TOKEN) {
                console.log("Using global bot token");
            }
        }

        if (!TELEGRAM_BOT_TOKEN) {
            throw new Error("No bot token available. Please configure a bot token in channel settings.");
        }

        const chatId = post.channels?.telegram_channel_id;
        if (!chatId) {
            throw new Error("Chat ID not configured. Please add your Telegram channel ID in channel settings.");
        }

        const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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
            console.log(`Sending photo to ${chatId}...`);
            const photoResponse = await fetchWithRetry(`${baseUrl}/sendPhoto`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    photo: post.image_url,
                    caption: truncate(post.content || "", 1024), // Telegram caption limit
                    parse_mode: "Markdown",
                }),
            });

            const photoData = await photoResponse.json();

            if (!photoResponse.ok) {
                console.error("Telegram sendPhoto error:", photoData);
                throw new Error(`Telegram Error: ${photoData.description || "Failed to send photo"}`);
            }

            messageId = photoData.result?.message_id?.toString();
            postSuccess = true;
            console.log("Photo post sent successfully");

        } else {
            console.log(`Sending text message to ${chatId}...`);
            const messageResponse = await fetchWithRetry(`${baseUrl}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: truncate(post.content, 4096), // Telegram message limit
                    parse_mode: "Markdown",
                }),
            });

            const messageData = await messageResponse.json();

            if (!messageResponse.ok) {
                console.error("Telegram sendMessage error:", messageData);
                throw new Error(`Telegram Error: ${messageData.description || "Failed to send message"}`);
            }

            messageId = messageData.result?.message_id?.toString();
            postSuccess = true;
            console.log("Text post sent successfully");
        }

        if (postSuccess) {
            // Update post status to 'posted'
            const now = new Date().toISOString();

            const { error: updateError } = await supabase
                .from('telegram_posts')
                .update({
                    status: 'posted',
                    posted_at: now,
                    telegram_message_id: messageId,
                    telegram_chat_id: chatId.toString(),
                })
                .eq('id', postId);

            if (updateError) {
                console.error('Failed to update post status:', updateError);
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Post sent successfully to Telegram",
                    messageId,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        throw new Error("Failed to send post");

    } catch (error) {
        console.error("Error sending post:", error);

        // Try to update post status to failed using the service role client
        if (currentPostId) {
            try {
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                const supabase = createClient(supabaseUrl, supabaseKey);

                await supabase
                    .from('telegram_posts')
                    .update({
                        status: 'failed',
                        error_message: error instanceof Error ? error.message : 'Unknown error',
                    })
                    .eq('id', currentPostId);
            } catch (dbError) {
                console.error("Failed to update post error status in DB:", dbError);
            }
        }

        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Failed to send post",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
