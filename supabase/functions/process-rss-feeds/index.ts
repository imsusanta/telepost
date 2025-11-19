import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { parseFeed } from "https://deno.land/x/rss@1.0.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RssFeedSource {
  id: string;
  user_id: string;
  channel_id: string;
  feed_url: string;
  feed_title: string | null;
  is_active: boolean;
  post_frequency: string;
  filters: any;
  settings: any;
  last_fetched_at: string | null;
}

interface RssFeedItem {
  id?: string;
  feed_id: string;
  item_guid: string;
  title: string;
  description: string | null;
  content: string | null;
  link: string | null;
  image_url: string | null;
  author: string | null;
  categories: string[] | null;
  published_date: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting RSS feed processing...");

    // Get request body to check if specific feed_id is provided
    let specificFeedId = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        specificFeedId = body.feed_id;
      } catch {
        // No body or invalid JSON, continue with all feeds
      }
    }

    // Get active RSS feeds
    let query = supabase
      .from('rss_feed_sources')
      .select('*')
      .eq('is_active', true);

    if (specificFeedId) {
      query = query.eq('id', specificFeedId);
    }

    const { data: feeds, error: feedsError } = await query;

    if (feedsError) {
      throw feedsError;
    }

    if (!feeds || feeds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active RSS feeds to process",
          processed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${feeds.length} active RSS feed(s) to process`);

    const results = [];

    for (const feed of feeds as RssFeedSource[]) {
      const startTime = Date.now();

      try {
        console.log(`Processing feed: ${feed.feed_url}`);

        // Log processing start
        await supabase.from('rss_processing_log').insert({
          feed_id: feed.id,
          process_type: 'fetch',
          status: 'started',
        });

        // Fetch RSS feed
        const response = await fetch(feed.feed_url, {
          headers: {
            'User-Agent': 'Quiz-Genie-Bot/1.0',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
        }

        const xml = await response.text();
        const parsedFeed = await parseFeed(xml);

        console.log(`Parsed feed: ${parsedFeed.title?.value || 'Unknown'}, ${parsedFeed.entries.length} entries`);

        // Update feed metadata if not set
        if (!feed.feed_title) {
          await supabase
            .from('rss_feed_sources')
            .update({
              feed_title: parsedFeed.title?.value || null,
              feed_description: parsedFeed.description?.value || null,
              last_fetched_at: new Date().toISOString(),
              error_count: 0,
              last_error: null,
            })
            .eq('id', feed.id);
        } else {
          await supabase
            .from('rss_feed_sources')
            .update({
              last_fetched_at: new Date().toISOString(),
              error_count: 0,
              last_error: null,
            })
            .eq('id', feed.id);
        }

        // Process feed entries
        let newItemsCount = 0;
        const filters = feed.filters || {};
        const keywords = filters.keywords || [];
        const excludeKeywords = filters.exclude_keywords || [];
        const categories = filters.categories || [];

        for (const entry of parsedFeed.entries) {
          try {
            // Generate GUID (use id or link as fallback)
            const guid = entry.id?.value || entry.links?.[0]?.href || entry.title?.value || '';
            if (!guid) {
              console.log('Skipping entry without GUID');
              continue;
            }

            // Apply filters
            const title = entry.title?.value || '';
            const description = entry.description?.value || '';
            const content = entry.content?.value || description;
            const entryCategories = entry.categories?.map(c => c.term || '') || [];

            // Check keyword filters
            if (keywords.length > 0) {
              const hasKeyword = keywords.some((kw: string) =>
                title.toLowerCase().includes(kw.toLowerCase()) ||
                description.toLowerCase().includes(kw.toLowerCase())
              );
              if (!hasKeyword) {
                console.log(`Skipping entry (no matching keywords): ${title}`);
                continue;
              }
            }

            // Check exclude keywords
            if (excludeKeywords.length > 0) {
              const hasExcludedKeyword = excludeKeywords.some((kw: string) =>
                title.toLowerCase().includes(kw.toLowerCase()) ||
                description.toLowerCase().includes(kw.toLowerCase())
              );
              if (hasExcludedKeyword) {
                console.log(`Skipping entry (excluded keyword): ${title}`);
                continue;
              }
            }

            // Check category filters
            if (categories.length > 0 && entryCategories.length > 0) {
              const hasCategory = categories.some((cat: string) =>
                entryCategories.some(ec => ec.toLowerCase().includes(cat.toLowerCase()))
              );
              if (!hasCategory) {
                console.log(`Skipping entry (no matching category): ${title}`);
                continue;
              }
            }

            // Extract image URL
            let imageUrl = null;
            if (entry.media) {
              imageUrl = entry.media.url || null;
            } else if (entry.content?.value) {
              // Try to extract image from content
              const imgMatch = entry.content.value.match(/<img[^>]+src="([^">]+)"/);
              if (imgMatch) {
                imageUrl = imgMatch[1];
              }
            }

            // Prepare feed item
            const feedItem: RssFeedItem = {
              feed_id: feed.id,
              item_guid: guid,
              title: title,
              description: description || null,
              content: content || null,
              link: entry.links?.[0]?.href || null,
              image_url: imageUrl,
              author: entry.author?.name || null,
              categories: entryCategories.length > 0 ? entryCategories : null,
              published_date: entry.published ? new Date(entry.published).toISOString() : null,
            };

            // Insert or update feed item (upsert)
            const { error: insertError } = await supabase
              .from('rss_feed_items')
              .upsert(feedItem, {
                onConflict: 'feed_id,item_guid',
                ignoreDuplicates: true,
              });

            if (insertError) {
              console.error(`Error inserting feed item: ${insertError.message}`);
            } else {
              newItemsCount++;
            }

          } catch (entryError) {
            console.error(`Error processing entry: ${entryError instanceof Error ? entryError.message : 'Unknown error'}`);
          }
        }

        const processingTime = Date.now() - startTime;

        // Log success
        await supabase.from('rss_processing_log').insert({
          feed_id: feed.id,
          process_type: 'fetch',
          status: 'success',
          items_fetched: newItemsCount,
          processing_time_ms: processingTime,
          metadata: {
            total_entries: parsedFeed.entries.length,
            new_items: newItemsCount,
          },
        });

        results.push({
          feed_id: feed.id,
          feed_url: feed.feed_url,
          status: 'success',
          new_items: newItemsCount,
          total_entries: parsedFeed.entries.length,
        });

        console.log(`Processed feed ${feed.id}: ${newItemsCount} new items`);

      } catch (feedError) {
        const errorMessage = feedError instanceof Error ? feedError.message : 'Unknown error';
        console.error(`Error processing feed ${feed.id}:`, errorMessage);

        const processingTime = Date.now() - startTime;

        // Log error
        await supabase.from('rss_processing_log').insert({
          feed_id: feed.id,
          process_type: 'fetch',
          status: 'error',
          error_message: errorMessage,
          processing_time_ms: processingTime,
        });

        // Update feed error count
        await supabase
          .from('rss_feed_sources')
          .update({
            error_count: feed.error_count ? feed.error_count + 1 : 1,
            last_error: errorMessage,
          })
          .eq('id', feed.id);

        results.push({
          feed_id: feed.id,
          feed_url: feed.feed_url,
          status: 'error',
          error: errorMessage,
        });
      }
    }

    // Now process pending items (generate quizzes and post)
    await processPendingItems(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in RSS feed processing:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processPendingItems(supabase: any) {
  try {
    console.log("Processing pending RSS items for posting...");

    // Get pending items (limit to 10 per run to avoid timeout)
    const { data: pendingItems, error: itemsError } = await supabase
      .rpc('get_pending_rss_items', { p_limit: 10 });

    if (itemsError) {
      console.error("Error fetching pending items:", itemsError);
      return;
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log("No pending RSS items to process");
      return;
    }

    console.log(`Found ${pendingItems.length} pending items to process`);

    for (const item of pendingItems) {
      try {
        const settings = item.settings || {};
        const autoGenerateQuiz = settings.auto_generate_quiz !== false; // Default to true

        if (autoGenerateQuiz) {
          // Generate quiz from RSS content
          const quizData = await generateQuizFromRssItem(supabase, item);

          if (quizData) {
            // Send quiz to Telegram
            await sendQuizToTelegram(supabase, item, quizData);

            // Mark as posted with quiz data
            await supabase.rpc('mark_rss_item_posted', {
              p_item_id: item.item_id,
              p_quiz_data: quizData,
            });
          } else {
            throw new Error("Failed to generate quiz");
          }
        } else {
          // Just send the article info without quiz
          await sendArticleToTelegram(supabase, item);

          // Mark as posted without quiz
          await supabase.rpc('mark_rss_item_posted', {
            p_item_id: item.item_id,
          });
        }

        console.log(`Successfully processed RSS item: ${item.item_title}`);

      } catch (itemError) {
        const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error';
        console.error(`Error processing RSS item ${item.item_id}:`, errorMessage);

        // Mark as failed
        await supabase.rpc('mark_rss_item_failed', {
          p_item_id: item.item_id,
          p_error_message: errorMessage,
        });
      }
    }

  } catch (error) {
    console.error("Error in processPendingItems:", error);
  }
}

async function generateQuizFromRssItem(supabase: any, item: any) {
  try {
    const settings = item.settings || {};
    const questionsPerQuiz = settings.questions_per_quiz || 5;

    // Prepare content for quiz generation
    const content = `
Title: ${item.item_title}

${item.item_description || ''}

${item.item_content || ''}

Source: ${item.item_link || ''}
    `.trim();

    // Call the generate-quiz edge function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        topic: item.item_title,
        num_questions: questionsPerQuiz,
        difficulty: settings.difficulty || 'medium',
        language: settings.language || 'en',
        context: content.substring(0, 3000), // Limit context length
      }),
    });

    if (!response.ok) {
      throw new Error(`Quiz generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.quiz;

  } catch (error) {
    console.error("Error generating quiz:", error);
    return null;
  }
}

async function sendQuizToTelegram(supabase: any, item: any, quizData: any) {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Send intro message with article info
    const introText = `📰 *${item.item_title}*\n\n${item.item_description || ''}\n\n🔗 [Read more](${item.item_link})\n\n📝 Test your knowledge with this quiz:`;

    await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: item.chat_id,
        text: introText,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });

    // Send each question as a poll
    for (let i = 0; i < quizData.questions.length; i++) {
      const question = quizData.questions[i];

      const pollResponse = await fetch(`${baseUrl}/sendPoll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: item.chat_id,
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
      if (i < quizData.questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Successfully sent quiz for RSS item: ${item.item_title}`);

  } catch (error) {
    console.error("Error sending quiz to Telegram:", error);
    throw error;
  }
}

async function sendArticleToTelegram(supabase: any, item: any) {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Send article info
    const messageText = `📰 *${item.item_title}*\n\n${item.item_description || ''}\n\n🔗 [Read more](${item.item_link})`;

    const messagePayload: any = {
      chat_id: item.chat_id,
      text: messageText,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    };

    const response = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messagePayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send message: ${errorData.description || "Unknown error"}`);
    }

    console.log(`Successfully sent article for RSS item: ${item.item_title}`);

  } catch (error) {
    console.error("Error sending article to Telegram:", error);
    throw error;
  }
}
