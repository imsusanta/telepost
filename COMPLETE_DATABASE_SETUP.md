# Complete Database Setup Guide

This guide covers the entire database schema for Quiz Genie, including all tables, relationships, and setup instructions.

## Quick Start

### Method 1: Supabase Dashboard (Recommended)

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/wpkxbrdgktmwnowvmwue/sql/new)
2. Run each migration file in chronological order (by timestamp in filename)
3. Or run the latest fix migration: `supabase/migrations/20251119030000_fix_billing_schema.sql`

### Method 2: Using Scripts

```bash
# Check database status
npm run db:check

# Fix billing schema issues
npm run db:fix
```

### Method 3: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref wpkxbrdgktmwnowvmwue

# Apply all migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id wpkxbrdgktmwnowvmwue > src/integrations/supabase/types.ts
```

## Database Architecture

### Core Tables

#### 1. profiles
Extended user information linked to Supabase Auth.

```sql
- id (UUID) - Links to auth.users(id)
- email (TEXT)
- full_name (TEXT)
- avatar_url (TEXT)
- role (TEXT) - 'user', 'admin', 'super_admin'
- can_purchase_plans (BOOLEAN)
- status (TEXT) - 'active', 'suspended', 'banned'
- last_login (TIMESTAMPTZ)
- login_count (INTEGER)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 2. channels
Telegram channels with isolated knowledge bases.

```sql
- id (UUID)
- user_id (UUID) - Owner
- name (TEXT)
- telegram_channel_id (TEXT)
- telegram_bot_token (TEXT)
- description (TEXT)
- settings (JSONB)
- last_auto_generated_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Subscription & Billing Tables

#### 3. subscription_plans
Available subscription tiers and features.

```sql
- id (UUID)
- name (TEXT) - 'free', 'starter', 'pro', 'agency', 'enterprise'
- display_name (TEXT)
- price (DECIMAL) - Monthly price in USD
- billing_period (TEXT) - 'monthly', 'yearly'

-- Limits
- max_telegram_channels (INTEGER)
- max_pdf_storage_gb (INTEGER)
- max_quizzes_per_month (INTEGER) - NULL = unlimited
- max_batch_quiz_generation (INTEGER)
- max_question_bank_size (INTEGER)

-- Features
- has_advanced_ai (BOOLEAN)
- has_auto_scheduling (BOOLEAN)
- has_auto_pdf_explanations (BOOLEAN)
- has_analytics_dashboard (BOOLEAN)
- has_leaderboards (BOOLEAN)
- has_custom_branding (BOOLEAN)
- has_multi_language (BOOLEAN)
- has_priority_support (BOOLEAN)
- has_api_access (BOOLEAN)
- has_white_label (BOOLEAN)

- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Default Plans:**
- **Free**: $0 - 10 quizzes/month, 1GB storage
- **Starter**: $29 - 50 quizzes/month, 10GB storage
- **Pro**: $99 - Unlimited quizzes, 50GB, all features
- **Agency**: $249 - 10 channels, 200GB, API access
- **Enterprise**: $999 - Unlimited everything, white label

#### 4. subscriptions
User subscription records.

```sql
- id (UUID)
- user_id (UUID) - UNIQUE - One subscription per user
- plan_id (UUID) - References subscription_plans
- status (TEXT) - 'active', 'canceled', 'expired', 'past_due'
- current_period_start (TIMESTAMPTZ)
- current_period_end (TIMESTAMPTZ)
- cancel_at_period_end (BOOLEAN)
- stripe_subscription_id (TEXT)
- stripe_customer_id (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 5. usage_tracking
Track usage for quota enforcement.

```sql
- id (UUID)
- user_id (UUID) - UNIQUE
- quizzes_generated_this_month (INTEGER)
- pdfs_uploaded_this_month (INTEGER)
- total_quizzes_generated (INTEGER)
- total_pdfs_uploaded (INTEGER)
- total_storage_used_bytes (BIGINT)
- current_period_start (TIMESTAMPTZ)
- last_reset_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Content & Knowledge Base Tables

#### 6. documents
PDF documents uploaded by users.

```sql
- id (UUID)
- user_id (UUID)
- channel_id (UUID) - Optional, for channel-specific docs
- file_name (TEXT)
- file_size_bytes (BIGINT)
- file_type (TEXT)
- storage_path (TEXT)
- title (TEXT)
- description (TEXT)
- language (TEXT) - 'en', 'bn', 'hi'
- page_count (INTEGER)
- word_count (INTEGER)
- processing_status (TEXT) - 'pending', 'processing', 'completed', 'failed'
- processing_error (TEXT)
- extracted_text (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 7. question_banks
Reusable question repository (50K+ questions support).

```sql
- id (UUID)
- user_id (UUID) - NULL for system questions
- channel_id (UUID) - Optional, for channel-specific questions
- question (TEXT)
- options (JSONB) - Array of answer options
- correct_option_index (INTEGER)
- explanation (TEXT)
- difficulty (TEXT) - 'easy', 'medium', 'hard'
- topic (TEXT)
- tags (JSONB)
- source (TEXT) - 'ai_generated', 'manual', 'document'
- usage_count (INTEGER)
- success_rate (NUMERIC)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Quiz & Analytics Tables

#### 8. quiz_generations
Record of all generated quizzes.

```sql
- id (UUID)
- user_id (UUID)
- channel_id (UUID)
- document_id (UUID)
- request_id (TEXT)
- topic (TEXT)
- difficulty (TEXT)
- question_count (INTEGER)
- questions (JSONB) - The actual quiz data
- metadata (JSONB)
- generation_time_ms (INTEGER)
- status (TEXT) - 'completed', 'failed'
- error_message (TEXT)
- created_at (TIMESTAMPTZ)
```

#### 9. analytics_events
Event tracking for analytics.

```sql
- id (UUID)
- user_id (UUID)
- event_type (TEXT) - 'quiz_generated', 'pdf_uploaded', etc.
- event_data (JSONB)
- quiz_generation_id (UUID)
- document_id (UUID)
- created_at (TIMESTAMPTZ)
```

#### 10. quiz_responses
Student answers to quizzes.

```sql
- id (UUID)
- user_id (UUID)
- quiz_generation_id (UUID)
- question_index (INTEGER)
- selected_option_index (INTEGER)
- is_correct (BOOLEAN)
- time_taken_ms (INTEGER)
- created_at (TIMESTAMPTZ)
```

### Gamification Tables

#### 11. leaderboards
Leaderboard rankings per channel.

```sql
- id (UUID)
- user_id (UUID)
- channel_id (UUID)
- score (INTEGER)
- quizzes_completed (INTEGER)
- correct_answers (INTEGER)
- total_answers (INTEGER)
- streak_days (INTEGER)
- achievements (JSONB)
- rank (INTEGER)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- UNIQUE(user_id, channel_id)
```

### Support & Branding Tables

#### 12. support_tickets
Priority support tickets for premium users.

```sql
- id (UUID)
- user_id (UUID)
- subject (TEXT)
- description (TEXT)
- status (TEXT) - 'open', 'in_progress', 'resolved', 'closed'
- priority (TEXT) - 'low', 'normal', 'high', 'urgent'
- category (TEXT)
- assigned_to (UUID)
- resolved_at (TIMESTAMPTZ)
- resolution (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 13. support_ticket_messages
Messages within support tickets.

```sql
- id (UUID)
- ticket_id (UUID)
- user_id (UUID)
- message (TEXT)
- is_staff_reply (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

#### 14. user_branding
Custom branding for premium users.

```sql
- id (UUID)
- user_id (UUID) - UNIQUE
- logo_url (TEXT)
- logo_storage_path (TEXT)
- primary_color (TEXT)
- secondary_color (TEXT)
- pdf_header (TEXT)
- pdf_footer (TEXT)
- institute_name (TEXT)
- institute_website (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Security & Admin Tables

#### 15. admin_activity_log
Audit log for admin actions.

```sql
- id (UUID)
- admin_id (UUID)
- action (TEXT)
- target_user_id (UUID)
- details (JSONB)
- ip_address (TEXT)
- user_agent (TEXT)
- session_id (TEXT)
- created_at (TIMESTAMPTZ)
```

#### 16. security_alerts
Security incident tracking.

```sql
- id (UUID)
- alert_type (TEXT)
- severity (TEXT) - 'low', 'medium', 'high', 'critical'
- user_id (UUID)
- details (JSONB)
- resolved (BOOLEAN)
- resolved_by (UUID)
- resolved_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 17. login_attempts
Track login attempts for security.

```sql
- id (UUID)
- email (TEXT)
- success (BOOLEAN)
- ip_address (TEXT)
- user_agent (TEXT)
- error_message (TEXT)
- created_at (TIMESTAMPTZ)
```

#### 18. session_tracking
Active user sessions.

```sql
- id (UUID)
- user_id (UUID)
- session_token (TEXT) - UNIQUE
- ip_address (TEXT)
- user_agent (TEXT)
- last_activity (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- expires_at (TIMESTAMPTZ)
- is_active (BOOLEAN)
```

#### 19. data_audit_log
Audit trail for sensitive data changes.

```sql
- id (UUID)
- table_name (TEXT)
- record_id (UUID)
- action (TEXT) - 'INSERT', 'UPDATE', 'DELETE'
- old_data (JSONB)
- new_data (JSONB)
- changed_by (UUID)
- changed_at (TIMESTAMPTZ)
```

### Scheduling Tables

#### 20. scheduled_telegram_posts
Scheduled quiz posts to Telegram.

```sql
- id (UUID)
- user_id (UUID)
- channel_id (UUID)
- quiz_data (JSONB)
- scheduled_time (TIMESTAMPTZ)
- status (TEXT) - 'pending', 'sent', 'failed'
- sent_at (TIMESTAMPTZ)
- error_message (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

## Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Admins have elevated permissions
- Public data (like subscription plans) is readable by all
- Anonymous quiz responses are allowed for student submissions

## Helper Functions

### get_user_plan(user_id)
Returns user's current subscription plan and features.

### increment_quiz_count(user_id)
Safely increments quiz generation counters for usage tracking.

### is_admin(user_id)
Check if user has admin or super_admin role.

### is_super_admin(user_id)
Check if user has super_admin role.

## Indexes

Optimized indexes on:
- Foreign keys (user_id, channel_id, etc.)
- Frequently queried fields (status, created_at, email)
- Unique constraints (user_id on subscriptions, usage_tracking)

## Triggers

All tables with `updated_at` columns have triggers to automatically update the timestamp.

## Storage Buckets

- **documents**: PDF file storage
- **logos**: User branding logos
- **avatars**: User profile pictures

## Environment Variables Required

```env
VITE_SUPABASE_URL=https://wpkxbrdgktmwnowvmwue.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (for migrations)
```

## Migration Order

1. Base tables (profiles, channels)
2. Subscription & billing tables
3. Content tables (documents, question_banks)
4. Analytics & quiz tables
5. Support & branding tables
6. Security & admin tables
7. Fix migrations (like the billing schema fix)

## Verification Checklist

After setup, verify:

- [ ] All 20 tables exist
- [ ] RLS is enabled on all tables
- [ ] Default subscription plans are seeded (5 plans)
- [ ] Helper functions are created
- [ ] Triggers are set up for updated_at columns
- [ ] TypeScript types are regenerated
- [ ] Billing page loads without errors
- [ ] User can view subscription plans

## Troubleshooting

See [DATABASE_FIX_GUIDE.md](./DATABASE_FIX_GUIDE.md) for specific issues and solutions.

## Related Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [Database Fix Guide](./DATABASE_FIX_GUIDE.md)
- [Migration Files](./supabase/migrations/)
