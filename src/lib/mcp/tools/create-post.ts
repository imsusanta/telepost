import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "create_post",
  title: "Create Telegram post (draft or scheduled)",
  description:
    "Create a new Telegram post for the signed-in user. Provide channel_id and content. Optionally set scheduled_at (ISO timestamp) to schedule it; otherwise it is saved as a draft.",
  inputSchema: {
    channel_id: z.string().uuid().describe("Target channel UUID from list_channels."),
    content: z.string().min(1).describe("Post text/content."),
    scheduled_at: z
      .string()
      .datetime()
      .optional()
      .describe("Optional ISO timestamp to schedule the post."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ channel_id, content, scheduled_at }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("telegram_posts")
      .insert({
        user_id: ctx.getUserId(),
        channel_id,
        content,
        status: scheduled_at ? "scheduled" : "draft",
        scheduled_at: scheduled_at ?? null,
      })
      .select()
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Post created (${data.id})` }],
      structuredContent: { post: data },
    };
  },
});
