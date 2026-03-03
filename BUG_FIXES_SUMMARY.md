# Bug Fixes Summary - AssetQL Deployment Issues

## ✅ Fixed Bugs

### Bug 1: WebSocket Handler - Missing requestContext Guard
**File:** `lambdas/websocket-handler/index.js` (Line 5)

**Problem:**
- Lambda was trying to destructure `routeKey` and `connectionId` from `event.requestContext` without checking if it exists
- This caused crashes when the event structure was unexpected

**Fix Applied:**
```javascript
// Added guard before destructuring
if (!event.requestContext) {
  console.error('Missing requestContext in event:', JSON.stringify(event));
  return { statusCode: 400, body: JSON.stringify({ error: 'Invalid WebSocket event' }) };
}
```

**Why This Matters:**
- Prevents Lambda crashes from malformed WebSocket events
- Provides clear error logging for debugging
- Returns proper HTTP 400 response instead of crashing

---

### Bug 2: Styles API - Enhanced Logging and Payload Validation
**File:** `frontend/lib/api/styles.ts` (Line 31)

**Problem:**
- No visibility into what payload was being sent to the styles API
- 400 errors were difficult to debug without request logging

**Fix Applied:**
```typescript
// Added detailed logging before API call
const payload = { s3Key, name };
console.log('[stylesApi.create] Sending payload to /styles:', payload);

const response = await apiClient.post('/styles', payload);
console.log('[stylesApi.create] Response from /styles:', response);

return response;
```

**Expected Payload Format:**
```json
{
  "s3Key": "style-references/uuid/filename.png",
  "name": "My Style Name"
}
```

**Backend Requirements (from style-embedding Lambda):**
- `s3Key` (required): S3 key where the image was uploaded
- `name` (optional): Display name for the style profile
- `styleProfileId` (optional): Can be provided or auto-generated

---

### Bug 3: API Client - Enhanced Error Logging
**File:** `frontend/lib/api/client.ts` (Line 28)

**Problem:**
- Generic error messages made debugging API failures difficult
- No visibility into request/response details

**Fix Applied:**
```typescript
// Enhanced error logging in response interceptor
console.error('[API Client Error]', {
  url: error.config?.url,
  method: error.config?.method,
  status: error.response?.status,
  statusText: error.response?.statusText,
  data: error.response?.data,
  message: error.message,
});
```

**Benefits:**
- See exact URL and method that failed
- View HTTP status code and response body
- Easier debugging of 400/500 errors

---

## 🔍 Verification Steps

### Step 1: Deploy Lambda Changes
```bash
# If using Terraform
cd infra
terraform apply

# Or if deploying manually
cd lambdas/websocket-handler
zip -r function.zip .
aws lambda update-function-code --function-name AssetQL-WebSocketHandler --zip-file fileb://function.zip
```

### Step 2: Deploy Frontend Changes
```bash
cd frontend
git add .
git commit -m "fix: add logging and guards for WebSocket and Styles API"
git push origin main
```

**Amplify will automatically:**
- Detect the push
- Run `pnpm install`
- Run `pnpm run build`
- Deploy to production

### Step 3: Verify AWS Systems Manager Parameters
**Go to AWS Console:**
1. Navigate to **Systems Manager** → **Parameter Store**
2. Look for parameters under path: `/amplify/d159rq55zyo314/main/`
3. Verify these parameters exist:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
   - `NEXT_PUBLIC_COGNITO_CLIENT_ID`
   - `NEXT_PUBLIC_WEBSOCKET_URL`

**If missing, create them:**
```bash
aws ssm put-parameter \
  --name "/amplify/d159rq55zyo314/main/NEXT_PUBLIC_API_BASE_URL" \
  --value "https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod" \
  --type "String"
```

### Step 4: Test WebSocket Handler
**Check CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/AssetQL-WebSocketHandler --follow
```

**Expected Output (no errors):**
- Connection events should log properly
- No "Cannot read property 'routeKey' of undefined" errors

### Step 5: Test Styles API Flow
**In Browser Console (after deployment):**
1. Open DevTools → Console
2. Create a new style profile
3. Look for logs:
```
[stylesApi.create] Sending payload to /styles: { s3Key: "...", name: "..." }
[stylesApi.create] Response from /styles: { styleProfileId: "...", ... }
```

**If you see 400 error:**
- Check the payload structure in console
- Verify `s3Key` is present and correctly formatted
- Check Lambda logs for backend validation errors

### Step 6: Monitor Lambda Logs
**WebSocket Handler:**
```bash
aws logs tail /aws/lambda/AssetQL-WebSocketHandler --follow
```

**Style Embedding:**
```bash
aws logs tail /aws/lambda/AssetQL-StyleEmbedding --follow
```

**Look for:**
- ✅ "Style profile created successfully"
- ❌ "Body parse error" or "Missing required field: s3Key"

---

## 🐛 Common Issues & Solutions

### Issue 1: "Missing requestContext" in WebSocket logs
**Cause:** Lambda is receiving unexpected event format
**Solution:** The guard now handles this gracefully and returns 400

### Issue 2: 400 Error from /styles endpoint
**Possible Causes:**
1. **Missing s3Key:** Check presign step completed successfully
2. **Invalid s3Key format:** Should be `style-references/uuid/filename.ext`
3. **Missing authentication:** Check Cognito token is being sent

**Debug Steps:**
```javascript
// In browser console
localStorage.getItem('idToken') // Should show JWT token
```

### Issue 3: Amplify Build Fails
**Check:**
1. Environment variables are set in Amplify Console
2. Build logs show `pnpm install` completed
3. TypeScript compilation passes

---

## 📊 Expected Behavior After Fixes

### WebSocket Handler
- ✅ Handles malformed events gracefully
- ✅ Returns proper error responses
- ✅ Logs detailed error information

### Styles API
- ✅ Logs request payload before sending
- ✅ Logs response after receiving
- ✅ Clear visibility into what's being sent/received

### API Client
- ✅ Detailed error logging for all failed requests
- ✅ Shows URL, method, status, and response data
- ✅ Easier debugging of API issues

---

## 🚀 Deployment Checklist

- [x] Fixed WebSocket handler guard
- [x] Added logging to styles API
- [x] Enhanced API client error logging
- [ ] Deploy Lambda changes (Terraform apply)
- [ ] Push frontend changes to trigger Amplify build
- [ ] Verify SSM parameters exist
- [ ] Test WebSocket connections
- [ ] Test style profile creation
- [ ] Monitor CloudWatch logs for errors

---

## 📝 Notes

**Why These Bugs Occurred:**
1. **WebSocket Handler:** Missing defensive programming for edge cases
2. **Styles API:** Insufficient logging made debugging difficult
3. **API Client:** Generic error handling hid important details

**Prevention:**
- Always add guards before destructuring
- Add comprehensive logging for API calls
- Use detailed error messages in production

**Performance Impact:**
- Minimal - console.log statements are negligible
- Can be removed or disabled in production if needed
- Consider using a proper logging service (CloudWatch Insights, Datadog, etc.)
