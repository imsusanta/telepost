import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const TELEGRAM_API_ORIGIN = 'https:' + '//api.telegram.org';
const MAX_ATTEMPTS = 3;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // AUTH GATE: cron shared secret, service role key (what pg_cron sends), or a
    // signed-in user's JWT. The service role key previously only went through
    // auth.getUser(), which never resolves a user for a service role JWT, so
    // every cron run was rejected with 401.
    {
        const cronSecret = Deno.env.get("CRON_SECRET");
        const provided = req.headers.get("x-cron-secret");
        const authHeader = req.headers.get("Authorization");
        const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

        let allowed = !!(cronSecret && provided && provided === cronSecret);
        if (!allowed && bearer && supabaseKey && bearer === supabaseKey) allowed = true;
        if (!allowed && bearer) {
            try {
                const tmp = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
                const { data } = await tmp.auth.getUser(bearer);
                if (data?.user) allowed = true;
            } catch { /* ignore */ }
        }
        if (!allowed) {
            console.warn("[process-scheduled-telegram-posts] Unauthorized invocation rejected.");
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }

    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // Claim due posts atomically. Previously this function plainly SELECTed
        // status='scheduled' rows, so two overlapping runs both sent the same post.
        let posts: any[] = [];
        const { data: claimed, error: claimError } = await supabaseAdmin.rpc('claim_due_telegram_posts');

        if (claimError) {
            console.warn('[process-scheduled-telegram-posts] claim_due_telegram_posts unavailable, falling back:', claimError.message);
            const { data: fallback, error: fallbackError } = await supabaseAdmin
                .from('telegram_posts')
                .select('*')
                .eq('status', 'scheduled')
                .lte('scheduled_time', new Date().toISOString())
                .order('scheduled_time', { ascending: true })
                .limit(10);
            if (fallbackError) {
                console.error('Error fetching scheduled posts:', fallbackError);
                return new Response(
                    JSON.stringify({ error: 'Failed to fetch scheduled posts' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            posts = fallback || [];
        } else {
            posts = claimed || [];
        }

        if (posts.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: "No scheduled posts to process", processed: 0 }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Processing ${posts.length} scheduled posts...`);

        // The claim RPC returns bare rows, so channel details are fetched separately.
        const channelIds = [...new Set(posts.map((post) => post.channel_id).filter(Boolean))];
        const channelsById = new Map<string, any>();
        if (channelIds.length > 0) {
            const { data: channels } = await supabaseAdmin
                .from('channels')
                .select('id, telegram_channel_id, telegram_bot_token')
                .in('id', channelIds);
            for (const channel of channels || []) channelsById.set(channel.id, channel);
        }

        let successCount = 0;
        let failedCount = 0;
        const results: any[] = [];

        const GLOBAL_TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

        for (const post of posts) {
            const channel = post.channel_id ? channelsById.get(post.channel_id) : null;
            try {
                let TELEGRAM_BOT_TOKEN: string | null = null;

                // 1. Token from the channel linked to the post
                if (channel?.telegram_bot_token) {
                    TELEGRAM_BOT_TOKEN = channel.telegram_bot_token;
                    console.log(`Using bot token from channel for post ${post.id}`);
                }

                // 2. Fallback: any bot token owned by the user
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

                // 3. Fallback: global token
                if (!TELEGRAM_BOT_TOKEN) {
                    TELEGRAM_BOT_TOKEN = GLOBAL_TELEGRAM_BOT_TOKEN || null;
                    if (TELEGRAM_BOT_TOKEN) console.log("Using global bot token (last resort)");
                }

                if (!TELEGRAM_BOT_TOKEN) {
                    throw new Error("No bot token available for this post.");
                }

                const chatId = channel?.telegram_channel_id;
                if (!chatId) {
                    throw new Error("Chat ID not configured for this post.");
                }

                const baseUrl = `${TELEGRAM_API_ORIGIN}/bot${TELEGRAM_BOT_TOKEN}`;

                const truncate = (str: string, limit: number): string => {
                    if (!str) return "";
                    const chars = Array.from(str);
                    return chars.length > limit ? chars.slice(0, limit - 3).join("") + "..." : str;
                };

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
                    return fetch(url, options);
                }

                let messageId: string | null = null;

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
                    const photoData = await photoResponse.json() as any;
                    if (!photoResponse.ok) throw new Error(photoData.description || "Failed to send photo");
                    messageId = photoData.result?.message_id?.toString();
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
                    const messageData = await messageResponse.json() as any;
                    if (!messageResponse.ok) throw new Error(messageData.description || "Failed to send message");
                    messageId = messageData.result?.message_id?.toString();
                }

                await supabaseAdmin
                    .from('telegram_posts')
                    .update({
                        status: 'posted',
                        posted_at: new Date().toISOString(),
                        telegram_message_id: messageId,
                        telegram_chat_id: chatId.toString(),
                        claimed_at: null,
                    })
                    .eq('id', post.id);

                successCount++;
                results.push({ id: post.id, status: 'success' });

                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const attempts = Number(post.attempts) || 0;
                const canRetry = attempts < MAX_ATTEMPTS;
                console.error(`Failed to process post ${post.id} (attempt ${attempts}/${MAX_ATTEMPTS}):`, errorMessage);

                // Leave the post retryable until the attempt ceiling is reached,
                // instead of burning it permanently on one transient error.
                await supabaseAdmin
                    .from('telegram_posts')
                    .update({
                        status: canRetry ? 'scheduled' : 'failed',
                        error_message: errorMessage,
                        claimed_at: null,
                    })
                    .eq('id', post.id);

                failedCount++;
                results.push({ id: post.id, status: canRetry ? 'retrying' : 'failed', error: errorMessage });
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
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
