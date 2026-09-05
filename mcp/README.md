# TelePost MCP Server

This directory defines the MCP integration contract for TelePost.

## Architecture

ChatGPT / MCP client -> TelePost MCP server -> authenticated TelePost API -> Supabase -> existing scheduler/Telegram services.

The MCP layer must reuse existing TelePost business logic. It must never contain Supabase service-role keys, Telegram bot tokens, or provider API keys.

## Planned tools

- `list_channels` — list Telegram destinations available to the authenticated user.
- `generate_quiz` — generate an exam-standard quiz through the existing TelePost generation service.
- `create_quiz` — save a generated quiz using existing authorization and validation.
- `publish_now` — publish an existing quiz immediately through the existing Telegram service.
- `schedule_quiz` — create an exact-time schedule through the existing scheduler service.
- `list_schedules` — list only schedules owned by the authenticated user.
- `cancel_schedule` — cancel only an owned schedule.
- `dashboard_stats` — return account-level statistics visible to the authenticated user.

## Security requirements

1. Authenticate every MCP request with a short-lived user-scoped credential.
2. Never accept a user ID as an authorization mechanism; derive identity from the verified credential.
3. Enforce ownership/RLS in the TelePost backend for every read/write operation.
4. Validate channel, quiz, and schedule IDs server-side.
5. Do not expose internal secrets or raw database errors to MCP clients.
6. Use idempotency for create/publish/schedule operations where retries could duplicate Telegram posts.
7. Keep MCP as an interface layer; existing TelePost services remain the source of truth.

## Example intent

A user should be able to tell ChatGPT:

> Create 10 government-exam-standard MCQs on Indian Polity in Bengali and schedule them for my Telegram channel at 9:00 AM tomorrow.

The MCP server should authenticate the user, call the existing quiz/scheduler services, and return a concise confirmation with the created resource IDs and scheduled time.
