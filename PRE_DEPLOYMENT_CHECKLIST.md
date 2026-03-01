# AssetQL Pre-Deployment Checklist

## ✅ Backend Infrastructure (COMPLETE)

- [x] Terraform infrastructure deployed
- [x] All Lambda functions created (11 functions)
- [x] API Gateway configured
- [x] WebSocket API configured
- [x] DynamoDB tables created (7 tables)
- [x] S3 bucket created
- [x] Cognito user pool configured
- [x] Bedrock Agents deployed (2 agents)
- [x] IAM roles and permissions configured
- [x] SQS queues created

**Backend Status**: ✅ READY

## ✅ Frontend Configuration (COMPLETE)

- [x] Environment variables updated in `.env.local`
- [x] `amplify.yml` build configuration exists
- [x] Next.js application builds successfully
- [x] Dependencies installed (pnpm)
- [x] API endpoints configured
- [x] Cognito authentication configured

**Frontend Status**: ✅ READY

## 📋 Pre-Deployment Verification

### 1. Verify Backend Endpoints

```bash
# Test API Gateway
curl https://uro07dkgbb.execute-api.ap-south-1.amazonaws.com/dev/api/v1

# Should return: {"message":"AssetQL API v1"}
```

### 2. Verify Cognito Configuration

```bash
# Check Cognito User Pool
aws cognito-idp describe-user-pool \
  --user-pool-id ap-south-1_xnE6jcOli \
  --region ap-south-1

# Should return user pool details
```

### 3. Verify S3 Bucket

```bash
# Check S3 bucket exists
aws s3 ls s3://assetql-assets-dev --region ap-south-1

# Should list bucket contents (empty is OK)
```

### 4. Test Frontend Build Locally

```bash
cd frontend

# Install dependencies
pnpm install

# Build
pnpm run build

# Should complete without errors
```

## 🚀 Ready to Deploy!

All prerequisites are met. You can now proceed with AWS Amplify deployment.

### Quick Deploy Steps:

1. **Push to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Ready for Amplify deployment"
   git push origin main
   ```

2. **Go to AWS Amplify Console**
   - URL: https://console.aws.amazon.com/amplify/
   - Region: ap-south-1 (Mumbai)

3. **Follow the deployment guide**
   - See: [AMPLIFY_DEPLOYMENT_STEPS.md](./AMPLIFY_DEPLOYMENT_STEPS.md)

## 📊 Deployment Information

### Backend Endpoints (Already Deployed)
```
API Gateway:  https://uro07dkgbb.execute-api.ap-south-1.amazonaws.com/dev/api/v1
WebSocket:    wss://o1w7hw0rkb.execute-api.ap-south-1.amazonaws.com/dev
Region:       ap-south-1 (Mumbai)
```

### Cognito Configuration
```
User Pool ID: ap-south-1_xnE6jcOli
Client ID:    2fmlhb5pbvjsp9t849h40r9h5i
Region:       ap-south-1
```

### S3 Storage
```
Bucket:       assetql-assets-dev
Region:       ap-south-1
```

## 🎯 Deployment Timeline

| Step | Duration | Status |
|------|----------|--------|
| Backend Infrastructure | 10-15 min | ✅ COMPLETE |
| Frontend Configuration | 5 min | ✅ COMPLETE |
| Push to GitHub | 2 min | ⏭️ NEXT |
| Amplify Setup | 5 min | ⏭️ PENDING |
| Build & Deploy | 5 min | ⏭️ PENDING |
| **Total** | **27-32 min** | **85% COMPLETE** |

## 💰 Cost Estimate

### Monthly Costs (Estimated)

**Backend (Already Running)**:
- Lambda: ~$5-10 (based on usage)
- API Gateway: ~$3-5
- DynamoDB: ~$2-5
- S3: ~$1-2
- Cognito: Free tier
- **Backend Total: ~$11-22/month**

**Frontend (After Deployment)**:
- Amplify Hosting: ~$5-10
- CloudFront: Included
- **Frontend Total: ~$5-10/month**

**Grand Total: ~$16-32/month**

## 🔒 Security Checklist

- [x] HTTPS enabled (API Gateway)
- [x] Cognito authentication configured
- [x] IAM roles with least privilege
- [x] S3 bucket encryption enabled
- [x] VPC not required (serverless)
- [x] Secrets managed via environment variables
- [ ] Custom domain with SSL (optional)
- [ ] WAF configuration (optional)

## 📈 Post-Deployment Tasks

After Amplify deployment completes:

1. **Test Authentication**
   - Sign up new user
   - Verify email
   - Log in

2. **Test API Connectivity**
   - Create session
   - Upload style reference
   - Generate batch

3. **Monitor Logs**
   - CloudWatch for backend
   - Amplify console for frontend

4. **Set Up Alerts** (Optional)
   - Build failure notifications
   - API error alerts
   - Cost alerts

## 🆘 Support Resources

- **Deployment Guide**: [AMPLIFY_DEPLOYMENT_STEPS.md](./AMPLIFY_DEPLOYMENT_STEPS.md)
- **Full Amplify Docs**: [AWS_AMPLIFY_DEPLOYMENT.md](./AWS_AMPLIFY_DEPLOYMENT.md)
- **Deployment Options**: [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md)
- **AWS Amplify Docs**: https://docs.aws.amazon.com/amplify/
- **Troubleshooting**: See AMPLIFY_DEPLOYMENT_STEPS.md

---

**Status**: ✅ READY FOR DEPLOYMENT  
**Next Step**: Push to GitHub and deploy via Amplify Console  
**Estimated Time Remaining**: 15-20 minutes  

🚀 **You're ready to deploy!**
