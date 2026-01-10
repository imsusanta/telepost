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

    try {
        const { postId, instantPost = false }: TelegramPostRequest = await req.json();

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
            throw new Error(`Post not found: ${postError?.message}`);
        }

        // Check if post is ready
        if (!instantPost && post.status !== 'scheduled') {
            throw new Error(`Post status must be 'scheduled' to post (current: ${post.status})`);
        }

        if (instantPost && post.status !== 'draft' && post.status !== 'scheduled') {
            throw new Error(`Can only instantly post with 'draft' or 'scheduled' status (current: ${post.status})`);
        }

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

        // Validate chat ID format
        if (!chatId.startsWith('@') && !chatId.startsWith('-')) {
            throw new Error(`Invalid chat ID format: "${chatId}". Use @channelname for public or -100xxxxxxxxxx for private channels.`);
        }

        const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        let messageId: string | null = null;
        let postSuccess = false;

        // Send post based on content type
        if (post.image_url) {
            // Send photo with caption
            const photoResponse = await fetch(`${baseUrl}/sendPhoto`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    photo: post.image_url,
                    caption: post.content || "",
                    parse_mode: "Markdown",
                }),
            });

            const photoData = await photoResponse.json();

            if (!photoResponse.ok) {
                const errorMsg = photoData.description || "Failed to send photo";
                throw new Error(`Telegram Error: ${errorMsg}`);
            }

            messageId = photoData.result?.message_id?.toString();
            postSuccess = true;
            console.log("Photo post sent successfully");

        } else {
            // Send text message
            const messageResponse = await fetch(`${baseUrl}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: post.content,
                    parse_mode: "Markdown",
                }),
            });

            const messageData = await messageResponse.json();

            if (!messageResponse.ok) {
                const errorMsg = messageData.description || "Failed to send message";
                throw new Error(`Telegram Error: ${errorMsg}`);
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
                    telegram_chat_id: chatId,
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

        // Try to update post status to failed
        try {
            const { postId } = await (await fetch(new Request(req.url, req))).json().catch(() => ({}));
            if (postId) {
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                const supabase = createClient(supabaseUrl, supabaseKey);

                await supabase
                    .from('telegram_posts')
                    .update({
                        status: 'failed',
                        error_message: error instanceof Error ? error.message : 'Unknown error',
                    })
                    .eq('id', postId);
            }
        } catch {
            // Ignore error update failures
        }

        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Failed to send post",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
