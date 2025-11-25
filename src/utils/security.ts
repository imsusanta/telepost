/**
 * Security Utilities for Quiz Genie
 *
 * Provides comprehensive security functions including:
 * - Input sanitization and validation
 * - XSS protection
 * - SQL injection prevention
 * - CSRF token generation
 * - Rate limiting helpers
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove potentially dangerous tags
  const dangerousTags = ['iframe', 'embed', 'object', 'applet', 'meta', 'link', 'style'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*>`, 'gi'), '');
  });

  return sanitized.trim();
};

/**
 * Escape HTML special characters to prevent XSS
 */
export const escapeHtml = (text: string): string => {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
};

/**
 * Validate email format with strict RFC 5322 compliance
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate strong password requirements
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
} => {
  const errors: string[] = [];
  let strengthScore = 0;

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    strengthScore++;
  }

  if (password.length >= 12) strengthScore++;
  if (password.length >= 16) strengthScore++;

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    strengthScore++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    strengthScore++;
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  } else {
    strengthScore++;
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    strengthScore++;
  }

  // Check for common patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890)+/, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i, // Sequential letters
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push('Password contains common patterns and is too predictable');
    strengthScore -= 2;
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong' = 'weak';
  if (strengthScore >= 7) strength = 'very-strong';
  else if (strengthScore >= 5) strength = 'strong';
  else if (strengthScore >= 3) strength = 'medium';

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
};

/**
 * Generate a cryptographically secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate and sanitize URL to prevent open redirect attacks
 */
export const sanitizeUrl = (url: string, allowedDomains: string[] = []): string | null => {
  try {
    const parsedUrl = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null;
    }

    // If allowed domains specified, check against them
    if (allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain =>
        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
      );
      if (!isAllowed) {
        return null;
      }
    }

    return parsedUrl.toString();
  } catch {
    // Invalid URL
    return null;
  }
};

/**
 * Rate limiting helper using localStorage
 * Returns true if action is allowed, false if rate limited
 */
export const checkRateLimit = (
  action: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remainingAttempts: number; resetTime: number } => {
  const key = `ratelimit_${action}`;
  const now = Date.now();

  try {
    const stored = localStorage.getItem(key);
    const data = stored ? JSON.parse(stored) : { attempts: 0, resetTime: now + windowMs };

    // Reset if window expired
    if (now >= data.resetTime) {
      data.attempts = 0;
      data.resetTime = now + windowMs;
    }

    // Check if limit exceeded
    if (data.attempts >= maxAttempts) {
      localStorage.setItem(key, JSON.stringify(data));
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: data.resetTime
      };
    }

    // Increment attempts
    data.attempts++;
    localStorage.setItem(key, JSON.stringify(data));

    return {
      allowed: true,
      remainingAttempts: maxAttempts - data.attempts,
      resetTime: data.resetTime
    };
  } catch {
    // If localStorage fails, allow the action
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      resetTime: now + windowMs
    };
  }
};

/**
 * Validate SQL input to prevent SQL injection
 * Note: This is a helper - always use parameterized queries
 */
export const validateSqlInput = (input: string): boolean => {
  // Check for common SQL injection patterns
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /('|(\\'))/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
  ];

  return !sqlInjectionPatterns.some(pattern => pattern.test(input));
};

/**
 * Sanitize filename to prevent path traversal attacks
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove path separators and parent directory references
  let sanitized = filename.replace(/[/\\]/g, '');
  sanitized = sanitized.replace(/\.\./g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove leading dots
  sanitized = sanitized.replace(/^\.+/, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.substring(0, 255 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  return sanitized || 'unnamed';
};

/**
 * Content Security Policy configuration
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cazrdevenbxdjussycfj.supabase.co"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", "data:", "https:", "blob:"],
  'font-src': ["'self'", "data:"],
  'connect-src': ["'self'", "https://cazrdevenbxdjussycfj.supabase.co", "wss://cazrdevenbxdjussycfj.supabase.co"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/**
 * Generate CSP header value
 */
export const generateCSP = (): string => {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * Detect potential XSS in text content
 */
export const detectXSS = (content: string): boolean => {
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(content));
};

/**
 * Hash sensitive data (client-side hashing for comparison)
 * Note: Use server-side bcrypt/argon2 for password hashing
 */
export const hashString = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate JSON structure safely
 */
export const safeParseJSON = <T>(json: string, defaultValue: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
};

/**
 * Check if user agent appears to be a bot
 */
export const isSuspiciousUserAgent = (userAgent: string): boolean => {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
};

/**
 * Validate integer input within bounds
 */
export const validateInteger = (
  value: unknown,
  min?: number,
  max?: number
): { isValid: boolean; value: number | null; error?: string } => {
  const num = parseInt(value, 10);

  if (isNaN(num)) {
    return { isValid: false, value: null, error: 'Invalid integer' };
  }

  if (min !== undefined && num < min) {
    return { isValid: false, value: null, error: `Value must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { isValid: false, value: null, error: `Value must be at most ${max}` };
  }

  return { isValid: true, value: num };
};

/**
 * Prevent timing attacks on string comparison
 */
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};
