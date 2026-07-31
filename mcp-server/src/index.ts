import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

// Load environment variables from the root .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Warning: Supabase credentials are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

// Initialize McpServer
const server = new McpServer({
  name: "telepost-mcp-server",
  version: "1.0.0",
});

// Expose tools
server.tool(
  "list-channels",
  "Get all Telegram channels configured in the TelePost application",
  {},
  async () => {
    try {
      const { data, error } = await supabase
        .from("channels")
        .select("id, name, telegram_channel_id, created_at");

      if (error) throw error;
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Error: ${error.message || String(error)}` }],
      };
    }
  }
);

server.tool(
  "list-scheduled-posts",
  "List scheduled posts for a specific channel",
  {
    channelId: z.string().describe("The UUID of the channel"),
    status: z.enum(["pending", "processing", "sent", "failed"]).optional().describe("Filter posts by status"),
    limit: z.number().optional().default(10).describe("Maximum number of posts to return"),
  },
  async ({ channelId, status, limit }) => {
    try {
      let query = supabase
        .from("scheduled_telegram_posts")
        .select("id, scheduled_time, status, quiz_data")
        .eq("channel_id", channelId)
        .order("scheduled_time", { ascending: true })
        .limit(limit);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Error: ${error.message || String(error)}` }],
      };
    }
  }
);

server.tool(
  "list-documents",
  "List uploaded Knowledge Base documents for a channel",
  {
    channelId: z.string().describe("The UUID of the channel"),
  },
  async ({ channelId }) => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, processing_status, created_at")
        .eq("channel_id", channelId);

      if (error) throw error;
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Error: ${error.message || String(error)}` }],
      };
    }
  }
);

server.tool(
  "trigger-quiz-generation",
  "Directly trigger quiz generation for a specific topic via the generate-quiz edge function",
  {
    topic: z.string().describe("The topic of the quiz"),
    questionCount: z.number().optional().default(5).describe("Number of questions to generate"),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium").describe("Difficulty level"),
    language: z.enum(["bn", "hi", "en"]).optional().default("bn").describe("Quiz language (bn = Bengali, hi = Hindi, en = English)"),
    channelId: z.string().optional().describe("Optional channel ID to bind quiz to"),
  },
  async ({ topic, questionCount, difficulty, language, channelId }) => {
    try {
      const functionUrl = `${supabaseUrl}/functions/v1/generate-quiz`;
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          topic,
          questionCount,
          difficulty,
          language,
          channelId,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Edge function failed with status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Error: ${error.message || String(error)}` }],
      };
    }
  }
);

// Connect using Stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("TelePost MCP Server running on stdio transport");
