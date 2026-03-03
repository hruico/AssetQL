# Quick Deployment Guide - Bug Fixes

## 🚀 Deploy in 3 Steps

### Step 1: Commit and Push Changes
```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "fix: WebSocket handler guard, styles API logging, enhanced error handling"

# Push to trigger Amplify deployment
git push origin main
```

### Step 2: Deploy Lambda Changes (WebSocket Handler)
```bash
# Navigate to infrastructure directory
cd infra

# Review changes
terraform plan

# Apply changes
terraform apply -auto-approve

# Or deploy specific Lambda only
cd ../lambdas/websocket-handler
zip -r function.zip index.js ../../shared/
aws lambda update-function-code \
  --function-name AssetQL-WebSocketHandler \
  --zip-file fileb://function.zip \
  --region ap-south-1
```

### Step 3: Verify Deployment
```bash
# Watch Amplify build logs
# Go to: AWS Console → Amplify → Your App → Build History

# Monitor Lambda logs
aws logs tail /aws/lambda/AssetQL-WebSocketHandler --follow --region ap-south-1

# Test the application
# Open: https://your-amplify-domain.amplifyapp.com
```

---

## ✅ What Was Fixed

| Bug | File | Fix |
|-----|------|-----|
| WebSocket crash | `lambdas/websocket-handler/index.js` | Added `requestContext` guard |
| Styles API 400 | `frontend/lib/api/styles.ts` | Added payload logging |
| Generic errors | `frontend/lib/api/client.ts` | Enhanced error logging |

---

## 🔍 Quick Verification

### Test 1: WebSocket Connection
```javascript
// In browser console
const ws = new WebSocket('wss://your-websocket-url?userId=test-user');
ws.onopen = () => console.log('✅ Connected');
ws.onerror = (e) => console.error('❌ Error:', e);
```

### Test 2: Style Profile Creation
1. Login to the app
2. Navigate to Styles page
3. Upload a reference image
4. Open DevTools Console
5. Look for logs:
   - `[stylesApi.create] Sending payload to /styles:`
   - `[stylesApi.create] Response from /styles:`

### Test 3: Check for Errors
```bash
# No errors in WebSocket logs
aws logs tail /aws/lambda/AssetQL-WebSocketHandler --since 5m

# No 400 errors in Style Embedding logs
aws logs tail /aws/lambda/AssetQL-StyleEmbedding --since 5m
```

---

## 🆘 Troubleshooting

### Amplify Build Still Failing?
**Check:**
1. Environment variables in Amplify Console
2. Build command: `pnpm run build`
3. Node version: 20.x

### WebSocket Still Crashing?
**Check:**
1. Lambda was redeployed with new code
2. CloudWatch logs show the guard message
3. API Gateway WebSocket route is configured

### Styles API Still Returns 400?
**Check:**
1. Presign endpoint returns valid `s3Key`
2. S3 upload completes successfully
3. Payload includes both `s3Key` and `name`
4. Check Lambda logs for validation errors

---

## 📞 Need Help?

**Check Logs:**
```bash
# Frontend (Amplify)
AWS Console → Amplify → Build History → View Logs

# Backend (Lambda)
AWS Console → CloudWatch → Log Groups → /aws/lambda/AssetQL-*

# API Gateway
AWS Console → API Gateway → Your API → Logs
```

**Common Commands:**
```bash
# Tail all Lambda logs
aws logs tail /aws/lambda/AssetQL-WebSocketHandler --follow
aws logs tail /aws/lambda/AssetQL-StyleEmbedding --follow

# Check recent errors
aws logs filter-pattern "ERROR" --log-group-name /aws/lambda/AssetQL-WebSocketHandler --since 1h

# Test API endpoint
curl -X POST https://your-api-url/styles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"s3Key":"style-references/test/image.png","name":"Test Style"}'
```

---

## ✨ Success Indicators

- ✅ Amplify build completes without errors
- ✅ No "requestContext" errors in WebSocket logs
- ✅ Style profile creation works end-to-end
- ✅ Console shows detailed request/response logs
- ✅ No 400 errors from /styles endpoint

---

**Deployment Time:** ~5-10 minutes
**Rollback:** `git revert HEAD && git push` (if needed)
