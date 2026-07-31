# TelePost Custom MCP Server

This is a custom Model Context Protocol (MCP) server for TelePost. It allows LLM agents and assistant interfaces (like Claude Desktop or Antigravity IDE) to query, test, and manage your TelePost application state directly through exposed tools.

## Exposed Tools

1. `list-channels`: Get all Telegram channels configured in the application.
2. `list-scheduled-posts`: List scheduled posts for a specific channel (with optional filtering by status).
3. `list-documents`: List uploaded knowledge base documents for a specific channel.
4. `trigger-quiz-generation`: Trigger a quiz generation manually for a topic via the `generate-quiz` edge function.

## Setup Instructions

### 1. Build the server
Inside the `mcp-server/` directory, install dependencies and compile the TypeScript code:
```bash
npm install
npm run build
```

### 2. Configure your MCP Client / Agent Host

#### Option A: Claude Desktop Config
Open your Claude Desktop configuration file (typically at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS) and add the following entry under `"mcpServers"`:

```json
{
  "mcpServers": {
    "telepost-mcp": {
      "command": "node",
      "args": [
        "/Users/susantalohar/Documents/TelePost/telepost v3/telepost/mcp-server/dist/index.js"
      ],
      "env": {
        "VITE_SUPABASE_URL": "https://wpkxbrdgktmwnowvmwue.supabase.co",
        "VITE_SUPABASE_PUBLISHABLE_KEY": "YOUR_PUBLISHABLE_OR_SERVICE_ROLE_KEY"
      }
    }
  }
}
```

#### Option B: Antigravity Config
Open your Antigravity MCP settings and register the server using the configuration above.

## Development
To run in hot-reload mode during development:
```bash
npm run dev
```
