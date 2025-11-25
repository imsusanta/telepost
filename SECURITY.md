# Security Documentation - TelePost

## Overview

This document outlines the security measures, best practices, and administrative features implemented in TelePost to protect user data and ensure system integrity.

## Table of Contents

1. [Security Features](#security-features)
2. [Role-Based Access Control](#role-based-access-control)
3. [Authentication & Authorization](#authentication--authorization)
4. [Data Protection](#data-protection)
5. [Security Headers](#security-headers)
6. [Rate Limiting](#rate-limiting)
7. [Audit Logging](#audit-logging)
8. [Super Admin Capabilities](#super-admin-capabilities)
9. [Best Practices](#best-practices)
10. [Incident Response](#incident-response)

---

## Security Features

### Implemented Security Measures

1. **Input Sanitization**
   - XSS prevention through input sanitization
   - SQL injection prevention (using parameterized queries)
   - File upload validation and sanitization

2. **Encryption**
   - Client-side encryption for sensitive data (AES-GCM)
   - Password hashing (Supabase Auth bcrypt)
   - Secure token generation

3. **Session Management**
   - Session tracking and monitoring
   - Automatic session expiration (24 hours)
   - Multi-device session management

4. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Referrer-Policy: strict-origin-when-cross-origin
   - Content-Security-Policy (CSP)
   - Permissions-Policy

---

## Role-Based Access Control

### User Roles

TelePost implements a three-tier role system:

#### 1. User (Default)
- Create and manage quizzes
- Upload documents
- Manage channels
- View analytics
- Access question bank

#### 2. Admin
- All user permissions
- View all users
- View all channels and documents
- Access admin activity logs
- Monitor system usage

#### 3. Super Admin
- All admin permissions
- Manage user roles (promote/demote admins)
- Toggle purchase permissions
- Suspend/ban user accounts
- Access security metrics
- View detailed audit logs
- Export user data (GDPR compliance)
- Delete user accounts

### Role Management

Super admins can update user roles using the Super Admin Dashboard:

```typescript
// Example: Promote user to admin
await AdminService.updateUserRole(userId, 'admin');

// Example: Demote admin to user
await AdminService.updateUserRole(userId, 'user');
```

---

## Authentication & Authorization

### Password Requirements

Enforced password requirements:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&*()_+-=[]{}|;:'",.<>?/)
- No common patterns (e.g., "12345678", "abcdefgh")

### Password Strength Indicator

The system provides real-time password strength feedback:
- **Weak**: Meets minimum requirements only
- **Medium**: 12+ characters with mixed complexity
- **Strong**: 16+ characters with high complexity
- **Very Strong**: Exceeds all requirements

### Rate Limiting

**Login Attempts:**
- 5 failed attempts per 15 minutes
- Account temporarily locked after limit exceeded
- Security alert generated for super admins

**Signup Attempts:**
- 3 attempts per hour
- Prevents automated account creation

**Implementation:**
```typescript
const rateLimit = checkRateLimit('login', 5, 15 * 60 * 1000);
if (!rateLimit.allowed) {
  // Show error and lock account
}
```

---

## Data Protection

### Row Level Security (RLS)

All database tables have RLS policies enabled:

```sql
-- Example: Users can only access their own data
CREATE POLICY "Users can view own data"
  ON channels FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Example: Admins can view all data
CREATE POLICY "Admins can view all data"
  ON channels FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));
```

### Sensitive Data Handling

1. **Telegram Bot Tokens**
   - Stored in database (consider encryption at rest)
   - Masked in UI (shows only first/last 4 characters)
   - Not exposed in API responses
   - Obfuscated in logs

2. **API Keys**
   - Never logged in plain text
   - Masked in admin interfaces
   - Rotatable through settings

3. **User Data**
   - GDPR-compliant data export
   - Right to deletion (super admin function)
   - Data minimization principles

### Client-Side Encryption

Utility functions for encrypting sensitive data:

```typescript
import { encryptData, decryptData } from '@/utils/encryption';

// Encrypt sensitive data before storage
const encrypted = await encryptData(sensitiveData, masterKey);

// Decrypt when needed
const decrypted = await decryptData(encrypted, masterKey);
```

---

## Security Headers

### Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cazrdevenbxdjussycfj.supabase.co;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
font-src 'self' data:;
connect-src 'self' https://cazrdevenbxdjussycfj.supabase.co wss://cazrdevenbxdjussycfj.supabase.co;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

### Additional Headers

- **X-Content-Type-Options**: Prevents MIME-sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Browser XSS filter
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

---

## Audit Logging

### Admin Activity Log

All administrative actions are logged:

```typescript
await AdminService.logActivity(
  'update_user_role',
  targetUserId,
  { oldRole: 'user', newRole: 'admin' }
);
```

Logged actions include:
- User role changes
- Purchase permission toggles
- User suspensions/bans
- Data exports
- Security alerts
- Login attempts (success/failure)
- Admin impersonation (for support)

### Security Alerts

Critical security events trigger alerts:

```typescript
await AdminService.createSecurityAlert(
  'excessive_login_attempts',
  'medium',
  { email: 'use***@example.com', attempts: 5 }
);
```

Alert Severity Levels:
- **Low**: Minor security events
- **Medium**: Suspicious activity requiring attention
- **High**: Potential security breach
- **Critical**: Active security incident

---

## Super Admin Capabilities

### User Management

Access via `/admin/super` dashboard:

1. **Search Users**
   - Search by email or name
   - View user details
   - Export user data

2. **Role Management**
   - Promote users to admin
   - Demote admins to user
   - Grant super admin access (carefully!)

3. **Purchase Control**
   - Enable/disable purchase permissions
   - Restrict specific users from upgrading

4. **Account Actions**
   - Suspend user accounts
   - Ban users (permanent)
   - Delete accounts (GDPR compliance)
   - Export all user data

### Security Monitoring

Super Admin Dashboard provides:

**Statistics:**
- Total users count
- Active subscriptions
- Admin count
- Restricted users

**Security Metrics:**
- Failed login attempts (24h)
- Suspicious activities
- Recent role changes
- Active admin sessions

**Activity Log:**
- Real-time admin actions
- Filterable by action type
- Searchable by user
- Exportable for audits

### Database Functions

Super admins have access to special database functions:

```sql
-- Update user role
SELECT admin_update_user_role(target_user_id, new_role);

-- Toggle purchase permission
SELECT admin_toggle_purchase_permission(target_user_id, can_purchase);

-- Suspend user
SELECT admin_suspend_user(target_user_id, reason);

-- Unsuspend user
SELECT admin_unsuspend_user(target_user_id, reason);
```

---

## Best Practices

### For Administrators

1. **Account Security**
   - Use strong, unique passwords
   - Enable 2FA when available
   - Never share credentials
   - Log out when finished

2. **User Management**
   - Review admin actions regularly
   - Audit role changes monthly
   - Monitor suspicious activity
   - Respond to security alerts promptly

3. **Data Handling**
   - Minimize data access
   - Export only when necessary
   - Delete exports after use
   - Follow GDPR guidelines

### For Developers

1. **Code Security**
   - Use parameterized queries (never string concatenation)
   - Sanitize all user inputs
   - Validate data on both client and server
   - Use TypeScript for type safety

2. **Authentication**
   - Always use Supabase Auth
   - Never store passwords in plain text
   - Implement proper session management
   - Use RLS policies for data access

3. **API Security**
   - Validate all inputs
   - Use rate limiting
   - Log all sensitive operations
   - Handle errors securely (don't expose internals)

### For Users

1. **Password Security**
   - Use strong, unique passwords
   - Don't share accounts
   - Change password if compromised
   - Use a password manager

2. **Account Safety**
   - Log out on shared devices
   - Review account activity
   - Report suspicious behavior
   - Keep recovery email updated

3. **Data Protection**
   - Don't share sensitive quiz content publicly
   - Review channel permissions
   - Limit bot token exposure
   - Use document encryption when needed

---

## Incident Response

### Security Incident Procedure

If you discover a security vulnerability:

1. **Do Not** publicly disclose the issue
2. **Report** to the security team immediately
3. **Provide** detailed information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

### Contact

- **Email**: susantalohr@gmail.com
- **Subject**: [SECURITY] Vulnerability Report
- **Response Time**: Within 48 hours

### Breach Response

In case of a security breach:

1. **Immediate Actions**
   - Identify affected systems
   - Contain the breach
   - Preserve evidence
   - Notify stakeholders

2. **Investigation**
   - Review audit logs
   - Identify attack vector
   - Assess data exposure
   - Document findings

3. **Remediation**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Update security measures
   - Monitor for recurrence

4. **Communication**
   - Notify affected users
   - Provide guidance
   - Offer support
   - Document lessons learned

---

## Security Checklist

### Deployment Security

- [ ] Environment variables secured
- [ ] Database RLS policies enabled
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Audit logging enabled
- [ ] Backups configured
- [ ] Monitoring alerts set up

### Regular Maintenance

- [ ] Review dependency vulnerabilities (monthly)
- [ ] Update dependencies (monthly)
- [ ] Audit user roles (quarterly)
- [ ] Review security logs (weekly)
- [ ] Test backup restoration (monthly)
- [ ] Security training for admins (quarterly)
- [ ] Penetration testing (annually)

---

## Additional Resources

### Security Tools

- **Security Utilities**: `/src/utils/security.ts`
- **Encryption Utils**: `/src/utils/encryption.ts`
- **Admin Service**: `/src/services/adminService.ts`
- **Super Admin Dashboard**: `/src/pages/admin/SuperAdmin.tsx`

### Documentation

- [Supabase Security](https://supabase.com/docs/guides/auth/auth-deep-dive)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

### Migration Files

- Super Admin Roles: `20251118140000_add_super_admin_roles.sql`
- Security Enhancements: `20251118200000_security_enhancements.sql`

---

## Version History

- **v2.0** (2025-11-18): Comprehensive security overhaul
  - Enhanced authentication with rate limiting
  - Super admin management dashboard
  - Security headers and CSP
  - Encryption utilities
  - Audit logging enhancements
  - Session tracking
  - Login attempt monitoring

---

## License

This security documentation is part of the TelePost project and is confidential. Unauthorized distribution is prohibited.

**Last Updated**: November 18, 2025
