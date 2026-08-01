import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listChannelsTool from "./tools/list-channels";
import listPostsTool from "./tools/list-posts";
import createPostTool from "./tools/create-post";
import listQuizzesTool from "./tools/list-quizzes";

// Direct Supabase host — never the .lovable.cloud proxy — is required so the
// OAuth issuer matches the discovery document mcp-js verifies against.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "telepost-mcp",
  title: "TelePost",
  version: "0.1.0",
  instructions:
    "Tools for TelePost: manage Telegram channels, view/create Telegram posts, and list generated quizzes for the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listChannelsTool, listPostsTool, createPostTool, listQuizzesTool],
});
