# Multi-Type Post Management System

## Overview

The Quiz Genie application has been expanded into a comprehensive channel post management system with support for multiple post types and hierarchical admin management.

## Features Implemented

### 1. Multi-Type Post Creation

The system now supports **6 different post types**:

#### a) **Text Posts**
- Regular formatted text messages
- Support for HTML, Markdown, and MarkdownV2 formatting
- Optional title field
- Rich text content

#### b) **Image Posts**
- Photo sharing with captions
- Automatic image upload to Supabase Storage
- Support for all standard image formats
- Optional title and caption

#### c) **Poll Posts**
- Interactive polls with multiple options
- Support for quiz-style polls with correct answers
- Anonymous or public voting
- Single or multiple answer selection
- Optional explanations

#### d) **PDF Posts**
- Document sharing capabilities
- Automatic PDF upload to Supabase Storage
- Optional caption and title
- Perfect for educational materials

#### e) **Promotional Posts**
- Marketing and advertisement styled content
- Call-to-action buttons with custom URLs
- Enhanced formatting options
- Button integration for links

#### f) **Quiz Posts**
- Existing quiz functionality preserved
- Multiple-choice questions with explanations
- Telegram quiz-style polls
- Automatic scoring and feedback

### 2. Hierarchical Admin System

#### **Super Admin Role**
- Full system access
- Can create, edit, and delete admin accounts
- Manage admin-to-channel assignments
- View all activities and posts
- Access admin activity logs
- System-wide settings control

#### **Admin Role**
- Can create posts in assigned channels
- Can manage posts based on permissions
- Limited access compared to super admin
- Granular permission control:
  - Create Posts
  - Edit Posts
  - Delete Posts
  - Manage Schedule

### 3. Admin Channel Assignments

Super admins can assign admins to specific channels with granular permissions:

- **Can Create Posts**: Allow admin to create new posts
- **Can Edit Posts**: Allow admin to edit existing posts
- **Can Delete Posts**: Allow admin to delete posts
- **Can Manage Schedule**: Allow admin to schedule posts

## Database Schema

### New Tables

#### 1. `channel_posts`
Stores all types of posts with the following fields:
- `id`: UUID primary key
- `user_id`: Creator of the post
- `channel_id`: Target channel
- `post_type`: Type of post (text, image, poll, pdf, promotional, quiz)
- `title`: Optional post title
- `content`: Text content
- `media_url`: URL for images/PDFs
- `media_storage_path`: Storage path in Supabase
- `poll_data`: JSONB for poll configuration
- `quiz_data`: JSONB for quiz content
- `parse_mode`: Formatting mode (HTML, Markdown, MarkdownV2)
- `scheduled_time`: When to publish
- `status`: draft, scheduled, published, failed
- `view_count`: Number of views
- `engagement_data`: Interaction metrics

#### 2. `admin_channel_assignments`
Maps admins to channels with permissions:
- `id`: UUID primary key
- `admin_id`: Admin user ID
- `channel_id`: Assigned channel
- `can_create_posts`: Permission flag
- `can_edit_posts`: Permission flag
- `can_delete_posts`: Permission flag
- `can_manage_schedule`: Permission flag
- `assigned_by`: Super admin who made the assignment

#### 3. `post_templates`
Reusable post templates:
- `id`: UUID primary key
- `user_id`: Template creator
- `name`: Template name
- `post_type`: Type of template
- `template_data`: JSONB template content
- `is_public`: Available to all users
- `usage_count`: Track popularity

## API/Services

### PostService (`src/services/postService.ts`)

Main service for post management:

```typescript
// Fetch posts with filters
PostService.fetchPosts(userId, filters)

// Create different post types
PostService.createTextPost(userId, postData)
PostService.createImagePost(userId, postData)
PostService.createPollPost(userId, postData)
PostService.createPDFPost(userId, postData)
PostService.createPromotionalPost(userId, postData)
PostService.createQuizPost(userId, postData)

// Manage posts
PostService.updatePost(postId, updates)
PostService.deletePost(postId)
PostService.publishPost(postId)

// Get statistics
PostService.getStatistics(userId)

// Get accessible channels
PostService.getAccessibleChannels(userId)

// Template management
PostService.getTemplates(userId)
PostService.createTemplate(userId, template)
```

### AdminManagementService (`src/services/adminManagementService.ts`)

Service for admin management:

```typescript
// Admin management
AdminManagementService.getAllAdmins()
AdminManagementService.updateAdminRole(adminId, role)
AdminManagementService.removeAdminPrivileges(adminId)

// Channel assignments
AdminManagementService.assignAdminToChannel(assignment)
AdminManagementService.getAdminChannelAssignments(adminId)
AdminManagementService.getChannelAdmins(channelId)
AdminManagementService.removeAdminFromChannel(adminId, channelId)
AdminManagementService.updateAdminChannelPermissions(assignmentId, permissions)

// Activity monitoring
AdminManagementService.getAdminActivityLog(adminId)
AdminManagementService.getAdminDashboardStats(adminId)
```

## Edge Functions

### send-channel-post
Located at: `supabase/functions/send-channel-post/index.ts`

Handles sending all post types to Telegram:
- Text messages with formatting
- Images with captions
- Polls (regular and quiz-style)
- PDF documents
- Promotional messages with buttons
- Quiz posts (multiple questions)

Automatically updates post status after sending.

## UI Components

### 1. Create Post Page (`/create-post`)
- Tabbed interface for all post types
- Channel selection dropdown
- Real-time form validation
- Schedule time picker
- File uploads for images and PDFs
- Quiz generator integration

### 2. Posts Dashboard (`/posts`)
- List view of all posts
- Filtering by type and status
- Search functionality
- Statistics cards
- Quick publish/delete actions
- Status badges (draft, scheduled, published, failed)

### 3. Admin Management (`/admin/management`)
- Super admin only access
- Admin list with channel assignments
- Assign/remove admin permissions
- Visual permission controls
- Activity monitoring

## Access Control

### Row Level Security (RLS)

All tables have comprehensive RLS policies:

#### channel_posts:
- Users can view posts for their own channels
- Admins can view posts for assigned channels
- Super admins can view all posts
- Create/update/delete based on permissions

#### admin_channel_assignments:
- Only super admins can manage
- Admins can view their own assignments

#### post_templates:
- Users can view their own and public templates
- Standard CRUD permissions

## Migration

To apply the database changes:

```bash
# The migration file is already created
# File: supabase/migrations/20251118210000_multi_type_posts_system.sql

# If using Supabase CLI:
supabase db push

# Or apply directly in Supabase Dashboard > SQL Editor
```

## Usage Examples

### Creating a Text Post

```typescript
const post = await PostService.createTextPost(userId, {
  channel_id: "channel-uuid",
  title: "Welcome Message",
  content: "<b>Hello!</b> This is a <i>formatted</i> message.",
  parse_mode: "HTML",
  scheduled_time: new Date("2025-12-01T10:00:00"),
});
```

### Creating a Poll

```typescript
const poll = await PostService.createPollPost(userId, {
  channel_id: "channel-uuid",
  question: "What's your favorite color?",
  options: ["Red", "Blue", "Green", "Yellow"],
  is_anonymous: true,
  allows_multiple_answers: false,
});
```

### Assigning Admin to Channel

```typescript
await AdminManagementService.assignAdminToChannel({
  admin_id: "admin-user-uuid",
  channel_id: "channel-uuid",
  can_create_posts: true,
  can_edit_posts: true,
  can_delete_posts: false,
  can_manage_schedule: true,
});
```

## Navigation

New menu items added to the dashboard:

- **Posts** - Main post management dashboard
- **Admin Management** - Super admin only, for managing admin assignments

Located in: `src/components/DashboardLayout.tsx`

## Security Features

1. **Row Level Security**: All database operations are protected
2. **Role-based Access**: Super Admin > Admin > User hierarchy
3. **Permission-based Actions**: Granular control over admin capabilities
4. **Activity Logging**: All admin actions are logged
5. **Secure File Upload**: Files stored in Supabase Storage with proper access control

## Backward Compatibility

✅ **All existing quiz functionality is preserved**:
- Quiz generation still works through `/dashboard/create-quiz`
- Scheduler functionality remains unchanged
- All existing edge functions continue to work
- No breaking changes to existing features

## Testing

To test the new features:

1. **Create a Super Admin**:
   - Update a user's role in the `profiles` table: `role = 'super_admin'`

2. **Test Post Creation**:
   - Navigate to `/create-post`
   - Try creating each post type
   - Test scheduling functionality

3. **Test Admin Management**:
   - Go to `/admin/management`
   - Assign an admin to a channel
   - Verify permissions work correctly

4. **Test Publishing**:
   - Create draft posts
   - Publish them to Telegram
   - Verify they appear in the channel

## Future Enhancements

Potential additions:
- Post analytics and engagement metrics
- Bulk post operations
- Post templates sharing
- Advanced scheduling (recurring posts)
- A/B testing for posts
- Post performance insights
- Media library management
- Advanced formatting editor
- Post approval workflows

## Support

For issues or questions:
- Check the admin activity log
- Review edge function logs in Supabase
- Check RLS policies if access issues occur
- Verify user roles in profiles table
