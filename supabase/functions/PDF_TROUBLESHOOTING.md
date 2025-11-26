# PDF Question Generation - Troubleshooting Guide

## Overview
This document provides comprehensive troubleshooting steps for PDF question generation issues.

## Architecture

### Edge Functions
1. **process-document** (`supabase/functions/process-document/index.ts`)
   - Extracts text from PDF using AI vision (Gemini 2.5 Flash)
   - Generates summary and topics
   - No JWT verification required (uses service role key)

2. **generate-quiz-from-document** (`supabase/functions/generate-quiz-from-document/index.ts`)
   - Generates quiz questions from extracted text
   - Requires JWT authentication
   - Uses AI (Gemini 2.5 Flash) for question generation

### Flow
```
User uploads PDF
  ↓
DocumentService.uploadDocument() - Store in Supabase Storage
  ↓
DocumentService.processDocument() - Trigger process-document edge function
  ↓
AI extracts text + analyzes document
  ↓
Document status updated to "completed"
  ↓
QuizService.generateQuizFromDocument() - Trigger generate-quiz-from-document
  ↓
AI generates questions from text
  ↓
Questions displayed to user
```

## Required Environment Variables

### Edge Functions (Supabase)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LOVABLE_API_KEY=your-lovable-api-key
```

**CRITICAL**: `LOVABLE_API_KEY` is required for both edge functions. Without it, PDF processing will fail.

### How to Set Environment Variables in Supabase

1. **Via Supabase Dashboard**:
   - Go to Project Settings → Edge Functions → Environment Variables
   - Add `LOVABLE_API_KEY` with your API key

2. **Via Supabase CLI**:
   ```bash
   supabase secrets set LOVABLE_API_KEY=your-api-key
   ```

## Common Issues & Solutions

### 1. "AI configuration missing" Error

**Symptom**: Error message: "AI configuration missing. Please contact administrator."

**Cause**: `LOVABLE_API_KEY` environment variable is not set in edge functions.

**Solution**:
```bash
# Check if secret is set
supabase secrets list

# Set the secret
supabase secrets set LOVABLE_API_KEY=your-api-key

# Redeploy edge functions
supabase functions deploy process-document
supabase functions deploy generate-quiz-from-document
```

### 2. "Authentication failed" Error

**Symptom**: 401 error when generating questions

**Cause**: User JWT token is expired or invalid

**Solution**:
- Ask user to log out and log back in
- Check Supabase auth session validity
- Verify `verify_jwt = true` is set in `config.toml` for `generate-quiz-from-document`

### 3. "Failed to download PDF" Error

**Symptom**: Error downloading PDF from storage

**Possible Causes**:
- Storage path is incorrect
- File doesn't exist in Supabase Storage
- Storage bucket permissions issue
- Service role key is invalid

**Debug Steps**:
```bash
# Check edge function logs
supabase functions logs process-document --tail

# Verify storage bucket exists
# In Supabase Dashboard: Storage → Buckets → "documents"

# Check file exists
# In Supabase Dashboard: Storage → documents → Browse files
```

### 4. "Rate limit exceeded" Error

**Symptom**: 429 error from AI API

**Cause**: Too many requests to Lovable AI Gateway

**Solution**:
- Wait a few minutes before retrying
- Check your Lovable API quota
- Consider implementing request throttling in frontend

### 5. "Insufficient text extracted" Warning

**Symptom**: PDF processed but no questions generated

**Possible Causes**:
- PDF is image-only (scanned document)
- PDF is encrypted
- PDF is corrupted
- PDF has very little text content

**Solutions**:
- Use OCR-processed PDFs
- Remove encryption from PDF
- Ensure PDF has at least 100 characters of text
- Try with a different PDF to isolate the issue

### 6. Edge Function Timeout

**Symptom**: Processing fails after 2 minutes

**Cause**: Large PDF takes too long to process

**Solution**:
- Reduce PDF file size (max 10MB recommended)
- Split large PDFs into smaller chunks
- Frontend has 120-second timeout configured

### 7. CORS Errors

**Symptom**: Browser console shows CORS policy errors

**Cause**: Edge function CORS headers not properly configured

**Solution**:
- Verify CORS headers are present in edge functions:
  ```typescript
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  ```
- Check OPTIONS request handling is correct

## Debugging Steps

### 1. Check Browser Console
```javascript
// Open browser dev tools (F12)
// Check Console tab for errors
// Look for:
// - Network errors (red entries)
// - API response errors
// - JavaScript errors
```

### 2. Check Edge Function Logs

```bash
# Real-time logs
supabase functions logs process-document --tail
supabase functions logs generate-quiz-from-document --tail

# Look for:
# - "=== PDF Processing Request Started ==="
# - "✓" success indicators
# - "ERROR" or "⚠" warning indicators
```

### 3. Check Supabase Storage

1. Go to Supabase Dashboard → Storage → documents
2. Verify uploaded PDF exists
3. Check file size and path
4. Try downloading file manually

### 4. Test with Small PDF First

- Use a simple 1-2 page PDF with clear text
- If this works, issue is likely PDF size or complexity
- If this fails, issue is likely configuration or API key

### 5. Verify API Keys

```bash
# Check if secrets are set
supabase secrets list

# Should show:
# - LOVABLE_API_KEY
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

## Enhanced Logging

Both edge functions now include comprehensive logging:

### process-document logs:
```
=== PDF Processing Request Started ===
Environment: LOVABLE_API_KEY configured ✓
✓ File downloaded successfully, size: X bytes (X.XX MB)
=== Starting AI Text Extraction ===
Converting PDF to base64...
✓ PDF converted to base64 (X characters)
Sending PDF to AI for text extraction...
✓ AI extraction response received (status: 200)
✓ Text extraction successful: X characters
Analyzing extracted text for summary and topics...
✓ Analysis response received (status: 200)
✓ Extracted X topics: topic1, topic2, ...
✓ AI analysis completed successfully
=== Document X processed successfully ===
```

### generate-quiz-from-document logs:
```
=== Quiz Generation from Document Request Started ===
✓ User authenticated: user-id
Request params: topic="X", questions=5, difficulty=medium, language=en
Document text length: X characters
✓ LOVABLE_API_KEY configured
Sending request to AI for quiz generation...
✓ AI response received (status: 200)
AI response content length: X characters
✓ Quiz generated successfully: 5 questions
=== Quiz Generation Completed ===
```

## Testing

### Manual Test Flow

1. **Upload PDF**
   ```
   - Select a small PDF (< 1MB)
   - Should see "Uploading PDF" toast
   ```

2. **Wait for Processing**
   ```
   - Should see "Processing PDF" toast
   - Check edge function logs for progress
   - Should complete within 30-60 seconds
   ```

3. **Generate Questions**
   ```
   - Should see "Generating Questions" toast
   - Questions should appear in UI
   - Check for 5 questions by default
   ```

### Test PDFs

Good test PDFs:
- Simple text-based PDF with 1-2 pages
- Educational content (lecture notes, textbook pages)
- Clear, readable text

Bad test PDFs:
- Image-only scanned documents (without OCR)
- Encrypted/password-protected PDFs
- Very large PDFs (> 10MB)
- Corrupted files

## Performance Optimization

### Current Limits
- Max file size: 10MB (frontend validation)
- Max text for quiz generation: 8000 characters
- Processing timeout: 120 seconds
- Max questions per quiz: 20
- Polling interval: 2 seconds
- Max polling attempts: 30 (60 seconds total)

### Recommendations
- Keep PDFs under 5MB for best performance
- Use text-based PDFs (not scanned images)
- Limit to 5-10 questions for faster generation
- Clear text content works best

## Support Resources

### Logs Location
- Edge function logs: Supabase Dashboard → Edge Functions → Logs
- Browser console: F12 → Console tab
- Network tab: F12 → Network tab

### Configuration Files
- `supabase/config.toml` - Edge function configuration
- `supabase/import_map.json` - Deno import mappings
- `supabase/functions/process-document/index.ts` - PDF processing
- `supabase/functions/generate-quiz-from-document/index.ts` - Quiz generation

### API Endpoints
- PDF Processing: `process-document` edge function
- Quiz Generation: `generate-quiz-from-document` edge function
- Storage: `documents` bucket in Supabase Storage

## Deployment

### Deploy Edge Functions
```bash
# Deploy both functions
supabase functions deploy process-document
supabase functions deploy generate-quiz-from-document

# Verify deployment
supabase functions list
```

### Verify Configuration
```bash
# Check config
cat supabase/config.toml

# Should include:
# [functions.process-document]
# verify_jwt = false
#
# [functions.generate-quiz-from-document]
# verify_jwt = true
```

## Contact

If issues persist after trying all troubleshooting steps:
1. Check Supabase status page for outages
2. Review Lovable AI Gateway status
3. Check GitHub issues for known problems
4. Create a new issue with:
   - Error messages from browser console
   - Edge function logs
   - Steps to reproduce
   - PDF characteristics (size, pages, type)
