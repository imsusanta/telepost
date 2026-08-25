# TelePost AI secrets

AI provider credentials are runtime secrets. They must not be stored in `system_settings`, `user_ai_settings`, browser storage, or client-side code.

## Required Supabase Edge Function secrets

For OpenRouter:

- `OPENROUTER_API_KEY`

For Cloudflare Workers AI:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Optional image provider:

- `OPENAI_API_KEY`

Configure these in the Supabase project's Edge Function secrets before applying the migration that removes legacy AI credentials from the database.

The Super Admin AI settings page now stores only non-secret configuration such as provider, model, temperature, and system prompt.

The AI Edge Functions read provider credentials exclusively from `Deno.env`. They never accept provider API keys from browser requests.
