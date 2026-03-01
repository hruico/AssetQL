# AssetQL Deployment Guide

## Quick Start

This guide walks you through deploying the AssetQL platform from scratch.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Terraform installed (v1.0+)
- Node.js 20+ and pnpm installed
- Domain name (optional, for production)

## Step 1: Deploy Infrastructure

### 1.1 Initialize Terraform

```bash
cd infra
terraform init
```
### 1.2.1 run layers-build.sh 
### 1.2 Review Configuration

Check `main.tf` for any variables you need to customize:
- AWS region (default: ap-south-1)
- Environment name (default: dev)

### 1.3 Plan Deployment

```bash
terraform plan
```

Review the resources that will be created:
- DynamoDB tables (7 tables)
- Lambda functions (7 functions)
- API Gateway REST API
- Cognito User Pool
- S3 buckets
- SQS queues
- Bedrock Agents (2 agents)
- IAM roles and policies

### 1.4 Deploy

```bash
terraform apply
```

Type `yes` when prompted. Deployment takes ~5-10 minutes.

### 1.5 Save Outputs

Terraform will output important values:
```
api_gateway_url = "https://xxxxx.execute-api.ap-south-1.amazonaws.com/dev"
cognito_user_pool_id = "ap-south-1_xxxxx"
cognito_client_id = "xxxxxxxxxxxxx"
websocket_url = "wss://xxxxx.execute-api.ap-south-1.amazonaws.com/dev"
```

## Step 2: Configure Frontend

### 2.1 Setup Environment Variables

```bash
cd frontend
./scripts/setup-env.sh
```

This script automatically fetches Terraform outputs and creates `.env.local`.

### 2.2 Verify Environment

Check `.env.local` contains:
```env
NEXT_PUBLIC_API_BASE_URL=https://xxxxx.execute-api.ap-south-1.amazonaws.com/dev/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=wss://xxxxx.execute-api.ap-south-1.amazonaws.com/dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_S3_BUCKET=assetql-assets-xxxxx
NEXT_PUBLIC_CLOUDFRONT_URL=https://xxxxx.cloudfront.net
```

### 2.3 Install Dependencies

```bash
pnpm install
```

## Step 3: Test Locally

### 3.1 Start Development Server

```bash
pnpm dev
```

Open http://localhost:3000

### 3.2 Test Authentication

1. Click "Sign Up"
2. Create test account
3. Verify email (check inbox)
4. Login with credentials
5. Should redirect to dashboard

### 3.3 Test Sessions

1. Navigate to "Sessions"
2. Click "Create Session"
3. Enter session name
4. Verify session appears in list

### 3.4 Test Style Profiles

1. Navigate to "Styles"
2. Click "Upload Style"
3. Upload test image
4. Wait for AI analysis (~5 seconds)
5. Verify style appears in list

## Step 4: Deploy Frontend to Production

### Option A: Deploy to AWS Amplify (Recommended for AWS Infrastructure)

AWS Amplify provides seamless integration with your existing AWS infrastructure.

**Quick Start:**
```bash
# 1. Create amplify.yml (already exists in frontend/)
# 2. Push to GitHub
git add frontend/amplify.yml
git commit -m "Add Amplify configuration"
git push origin main

# 3. Deploy via AWS Console
# - Go to AWS Amplify Console
# - Connect your GitHub repository
# - Select branch: main
# - Set monorepo root: frontend
# - Add environment variables from .env.local
# - Deploy!
```

**Detailed Guide:** See [AWS_AMPLIFY_DEPLOYMENT.md](./AWS_AMPLIFY_DEPLOYMENT.md)

**Advantages:**
- Native AWS integration
- Same region as backend (lower latency)
- Built-in CI/CD
- Free SSL certificates
- CloudFront CDN included
- PR preview environments
- Cost-effective (~$8-40/month)

### Option B: Deploy to Vercel (Fastest Setup)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

Configure environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.local`
3. Redeploy

### Option B: Deploy to Vercel (Fastest Setup)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

Configure environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.local`
3. Redeploy

**Advantages:**
- Fastest deployment
- Excellent DX
- Global edge network
- Free tier available

### Option C: Deploy to AWS Amplify via CLI

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize and deploy
cd frontend
amplify init
amplify add hosting
amplify publish
```

See [AWS_AMPLIFY_DEPLOYMENT.md](./AWS_AMPLIFY_DEPLOYMENT.md) for detailed instructions.

### Option D: Self-Host with Docker

```bash
cd frontend
pnpm build

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
EOF

# Build and run
docker build -t assetql-frontend .
docker run -p 3000:3000 --env-file .env.local assetql-frontend
```

## Step 5: Post-Deployment Verification

### 5.1 Test Production Deployment

1. Visit production URL
2. Test signup/login flow
3. Create test session
4. Upload test style profile
5. Check browser console for errors

### 5.2 Monitor Backend

```bash
# Check Lambda logs
aws logs tail /aws/lambda/session-manager --follow

# Check API Gateway logs
aws logs tail /aws/apigateway/AssetQL-API-dev --follow
```

### 5.3 Test API Endpoints

```bash
# Get Cognito token (after login)
TOKEN="your-jwt-token"

# Test list sessions
curl -H "Authorization: Bearer $TOKEN" \
  https://xxxxx.execute-api.ap-south-1.amazonaws.com/dev/api/v1/sessions

# Test list styles
curl -H "Authorization: Bearer $TOKEN" \
  https://xxxxx.execute-api.ap-south-1.amazonaws.com/dev/api/v1/styles
```

## Step 6: Create Test User

### Via AWS Console

1. Go to Cognito → User Pools
2. Select AssetQL user pool
3. Click "Create user"
4. Enter email and temporary password
5. User will be prompted to change password on first login

### Via AWS CLI

```bash
aws cognito-idp admin-create-user \
  --user-pool-id ap-south-1_xxxxx \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

## Troubleshooting

### Issue: Frontend can't connect to API

**Solution:**
1. Check `.env.local` has correct API URL
2. Verify API Gateway is deployed
3. Check CORS configuration
4. Verify Cognito credentials

### Issue: Authentication fails

**Solution:**
1. Verify Cognito User Pool ID and Client ID
2. Check user is confirmed (email verified)
3. Check password meets requirements (8+ chars, uppercase, lowercase, number)
4. Clear browser cache and cookies

### Issue: Sessions/Styles list is empty

**Solution:**
1. Check Lambda function logs for errors
2. Verify DynamoDB tables exist
3. Check GSI (Global Secondary Index) is active
4. Verify userId is being extracted correctly

### Issue: Style upload fails

**Solution:**
1. Check file size (<5MB recommended)
2. Verify S3 bucket permissions
3. Check Lambda has Bedrock permissions
4. Verify image format (PNG, JPG supported)

### Issue: Terraform apply fails

**Solution:**
1. Check AWS credentials are configured
2. Verify region supports Bedrock (ap-south-1, us-east-1, us-west-2)
3. Check for resource limits (Lambda, DynamoDB)
4. Review error message for specific resource

## Monitoring & Observability

### CloudWatch Dashboards

Create custom dashboard:
1. Go to CloudWatch → Dashboards
2. Create new dashboard "AssetQL-Monitoring"
3. Add widgets:
   - Lambda invocations
   - API Gateway requests
   - DynamoDB read/write capacity
   - Error rates

### Alarms

Set up critical alarms:
```bash
# Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name AssetQL-Lambda-Errors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold

# API Gateway 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name AssetQL-API-5xx \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### X-Ray Tracing

All Lambda functions have X-Ray enabled. View traces:
1. Go to X-Ray → Service Map
2. Click on Lambda function
3. View traces and performance

## Cost Optimization

### Expected Monthly Costs (100 users, 1000 sessions/month)

- **Lambda**: ~$5-10 (pay per invocation)
- **DynamoDB**: ~$5-10 (pay per request)
- **API Gateway**: ~$3-5 (pay per request)
- **S3**: ~$5-10 (storage + transfer)
- **Cognito**: Free (up to 50,000 MAU)
- **Bedrock**: ~$50-100 (Nova Lite usage)
- **Total**: ~$70-140/month

### Cost Reduction Tips

1. Use DynamoDB on-demand pricing (already configured)
2. Enable S3 lifecycle policies for old assets
3. Use CloudFront caching (already configured)
4. Monitor and optimize Lambda memory settings
5. Use Bedrock batch inference for large jobs

## Security Checklist

- [ ] Enable MFA for AWS root account
- [ ] Rotate IAM access keys regularly
- [ ] Enable CloudTrail for audit logging
- [ ] Configure S3 bucket encryption (already enabled)
- [ ] Set up AWS WAF for API Gateway (optional)
- [ ] Enable GuardDuty for threat detection
- [ ] Configure VPC for Lambda functions (optional)
- [ ] Set up AWS Secrets Manager for sensitive data
- [ ] Enable DynamoDB point-in-time recovery (already enabled)
- [ ] Configure backup policies

## Backup & Disaster Recovery

### DynamoDB Backups

Point-in-time recovery is enabled. To restore:
```bash
aws dynamodb restore-table-to-point-in-time \
  --source-table-name AssetQL-sessions \
  --target-table-name AssetQL-sessions-restored \
  --restore-date-time 2024-01-01T00:00:00Z
```

### S3 Versioning

Enable versioning for asset bucket:
```bash
aws s3api put-bucket-versioning \
  --bucket assetql-assets-xxxxx \
  --versioning-configuration Status=Enabled
```

### Infrastructure Backup

Terraform state is stored in S3 with versioning enabled. To restore:
```bash
cd infra
terraform init
terraform plan
terraform apply
```

## Scaling Considerations

### Current Limits
- Lambda: 1000 concurrent executions (default)
- API Gateway: 10,000 requests/second (default)
- DynamoDB: Unlimited (on-demand mode)
- S3: Unlimited storage

### Scaling Strategy
1. Monitor CloudWatch metrics
2. Increase Lambda reserved concurrency if needed
3. Request API Gateway limit increase if needed
4. Use DynamoDB auto-scaling (already configured)
5. Enable CloudFront caching for static assets

## Support & Resources

### Documentation
- Frontend: `/frontend/README.md`
- Backend: `/BACKEND_API_IMPLEMENTATION.md`
- Production: `/frontend/PRODUCTION_READINESS.md`

### AWS Resources
- Lambda: https://docs.aws.amazon.com/lambda/
- API Gateway: https://docs.aws.amazon.com/apigateway/
- DynamoDB: https://docs.aws.amazon.com/dynamodb/
- Bedrock: https://docs.aws.amazon.com/bedrock/

### Community
- GitHub Issues: [Your repo URL]
- Discord: [Your Discord URL]
- Email: support@assetql.com

---

**Deployment Status:** ✅ Ready for production
**Last Updated:** Phase 2.5 Complete
**Next Steps:** Deploy and test in production environment
