# AWS Amplify Deployment Guide for AssetQL Frontend

## Overview

AWS Amplify provides a fully managed CI/CD and hosting service for the AssetQL Next.js frontend. This guide covers deployment, configuration, and best practices.

## Why AWS Amplify?

### Advantages
- **Fully Managed**: No server management required
- **CI/CD Built-in**: Automatic deployments on git push
- **Global CDN**: CloudFront distribution included
- **SSL/TLS**: Free HTTPS certificates
- **Preview Environments**: Automatic preview deployments for PRs
- **Environment Variables**: Secure management in AWS console
- **Monitoring**: Built-in CloudWatch integration
- **Cost-Effective**: Pay only for build minutes and data transfer
- **AWS Integration**: Native integration with other AWS services

### Comparison with Vercel

| Feature | AWS Amplify | Vercel |
|---------|-------------|--------|
| Hosting | AWS (same region as backend) | Global edge network |
| CI/CD | Built-in | Built-in |
| Cost | AWS pricing | Free tier + paid |
| AWS Integration | Native | Limited |
| Custom Domain | Yes (Route 53) | Yes |
| Preview Deploys | Yes | Yes |
| Build Time | ~3-5 min | ~2-3 min |

## Prerequisites

- AWS Account with Amplify access
- GitHub/GitLab/Bitbucket repository
- Backend infrastructure deployed (Terraform)
- Environment variables from backend

## Step 1: Prepare Repository

### 1.1 Create amplify.yml

The build configuration file is already created at `frontend/amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install -g pnpm
        - pnpm install --frozen-lockfile
    build:
      commands:
        - pnpm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### 1.2 Commit and Push

```bash
git add frontend/amplify.yml
git commit -m "Add Amplify build configuration"
git push origin main
```

## Step 2: Create Amplify App

### Option A: AWS Console (Recommended for First Time)

1. **Navigate to AWS Amplify**
   - Go to AWS Console
   - Search for "Amplify"
   - Click "Get Started" under "Amplify Hosting"

2. **Connect Repository**
   - Select your Git provider (GitHub/GitLab/Bitbucket)
   - Authorize AWS Amplify to access your repository
   - Select the AssetQL repository
   - Select the branch (e.g., `main`)

3. **Configure Build Settings**
   - App name: `AssetQL-Frontend`
   - Environment: `production`
   - Build settings: Auto-detected from `amplify.yml`
   - Monorepo: Enable and set root directory to `frontend`

4. **Advanced Settings**
   - Enable automatic builds on push: ✅
   - Enable PR previews: ✅ (optional)
   - Build image: `Amazon Linux:2023`

5. **Review and Deploy**
   - Review all settings
   - Click "Save and Deploy"

### Option B: AWS CLI

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize Amplify app
cd frontend
amplify init

# Follow prompts:
# - App name: AssetQL-Frontend
# - Environment: production
# - Default editor: Visual Studio Code
# - App type: javascript
# - Framework: react
# - Source directory: .
# - Distribution directory: .next
# - Build command: pnpm build
# - Start command: pnpm start

# Add hosting
amplify add hosting

# Select: Hosting with Amplify Console
# Select: Manual deployment

# Publish
amplify publish
```

### Option C: Terraform (Infrastructure as Code)

Create `infra/modules/amplify/main.tf`:

```hcl
resource "aws_amplify_app" "assetql_frontend" {
  name       = "AssetQL-Frontend"
  repository = "https://github.com/your-org/assetql"
  
  # OAuth token for GitHub
  access_token = var.github_token
  
  # Build settings
  build_spec = file("${path.module}/../../frontend/amplify.yml")
  
  # Environment variables (will be added later)
  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = "frontend"
    AMPLIFY_DIFF_DEPLOY       = "false"
  }
  
  # Enable auto branch creation
  enable_auto_branch_creation = true
  enable_branch_auto_build    = true
  
  # Custom rules for SPA routing
  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/index.html"
  }
  
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>"
    status = "200"
    target = "/index.html"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.assetql_frontend.id
  branch_name = "main"
  
  enable_auto_build = true
  
  # Environment variables for this branch
  environment_variables = {
    NEXT_PUBLIC_API_BASE_URL      = var.api_gateway_url
    NEXT_PUBLIC_COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    NEXT_PUBLIC_COGNITO_CLIENT_ID    = var.cognito_client_id
    NEXT_PUBLIC_AWS_REGION           = var.aws_region
  }
}

resource "aws_amplify_webhook" "main" {
  app_id      = aws_amplify_app.assetql_frontend.id
  branch_name = aws_amplify_branch.main.branch_name
  description = "Trigger build on push to main"
}

output "amplify_app_id" {
  value = aws_amplify_app.assetql_frontend.id
}

output "amplify_default_domain" {
  value = aws_amplify_app.assetql_frontend.default_domain
}

output "amplify_webhook_url" {
  value = aws_amplify_webhook.main.url
}
```

## Step 3: Configure Environment Variables

### 3.1 Get Backend Values

Run the setup script to get values:
```bash
cd frontend
./scripts/setup-env.sh
cat .env.local
```

### 3.2 Add to Amplify Console

1. Go to Amplify Console
2. Select your app
3. Click "Environment variables" in left menu
4. Add the following variables:

| Variable | Value | Example |
|----------|-------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | API Gateway URL + /api/v1 | `https://abc123.execute-api.ap-south-1.amazonaws.com/dev/api/v1` |
| `NEXT_PUBLIC_WEBSOCKET_URL` | WebSocket URL | `wss://xyz789.execute-api.ap-south-1.amazonaws.com/dev` |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito User Pool ID | `ap-south-1_ABC123` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito Client ID | `1a2b3c4d5e6f7g8h9i0j` |
| `NEXT_PUBLIC_AWS_REGION` | AWS Region | `ap-south-1` |
| `NEXT_PUBLIC_S3_BUCKET` | S3 Bucket Name | `assetql-assets-abc123` |
| `NEXT_PUBLIC_CLOUDFRONT_URL` | CloudFront URL | `https://d123abc.cloudfront.net` |

### 3.3 Automated Script (Optional)

Create a script to sync environment variables:

```bash
#!/bin/bash
# scripts/sync-amplify-env.sh

APP_ID="your-amplify-app-id"
BRANCH="main"

# Get Terraform outputs
cd ../infra
API_URL=$(terraform output -raw api_gateway_url)
COGNITO_POOL=$(terraform output -raw cognito_user_pool_id)
COGNITO_CLIENT=$(terraform output -raw cognito_client_id)
WS_URL=$(terraform output -raw websocket_url)
S3_BUCKET=$(terraform output -raw s3_bucket_name)
CF_URL=$(terraform output -raw cloudfront_url)

# Update Amplify environment variables
aws amplify update-branch \
  --app-id $APP_ID \
  --branch-name $BRANCH \
  --environment-variables \
    NEXT_PUBLIC_API_BASE_URL="${API_URL}/api/v1" \
    NEXT_PUBLIC_WEBSOCKET_URL="$WS_URL" \
    NEXT_PUBLIC_COGNITO_USER_POOL_ID="$COGNITO_POOL" \
    NEXT_PUBLIC_COGNITO_CLIENT_ID="$COGNITO_CLIENT" \
    NEXT_PUBLIC_AWS_REGION="ap-south-1" \
    NEXT_PUBLIC_S3_BUCKET="$S3_BUCKET" \
    NEXT_PUBLIC_CLOUDFRONT_URL="$CF_URL"

echo "✅ Environment variables synced to Amplify"
```

## Step 4: Configure Build Settings

### 4.1 Monorepo Configuration

If your frontend is in a subdirectory:

1. Go to App settings → Build settings
2. Enable "Monorepo"
3. Set app root: `frontend`
4. Save

### 4.2 Build Image

Use the latest Amazon Linux image:
- Go to App settings → Build settings
- Build image: `Amazon Linux:2023`
- Save

### 4.3 Build Timeout

For large builds, increase timeout:
- Go to App settings → Build settings
- Build timeout: `15 minutes` (default is 5)
- Save

### 4.4 Node Version

Ensure Node 20+ is used. Add to `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm install 20
        - nvm use 20
        - npm install -g pnpm
        - pnpm install --frozen-lockfile
```

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Domain

1. Go to Domain management
2. Click "Add domain"
3. Enter your domain (e.g., `assetql.com`)
4. Amplify will provide DNS records

### 5.2 Configure DNS

Add the following records to your DNS provider:

```
Type: CNAME
Name: www
Value: [amplify-provided-value]

Type: ANAME/ALIAS
Name: @
Value: [amplify-provided-value]
```

For Route 53:
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-changes.json
```

### 5.3 SSL Certificate

Amplify automatically provisions SSL certificates via AWS Certificate Manager (ACM). This takes ~15-30 minutes.

## Step 6: Deploy

### 6.1 Trigger Build

**Option 1: Git Push**
```bash
git add .
git commit -m "Deploy to Amplify"
git push origin main
```

**Option 2: Manual Trigger**
1. Go to Amplify Console
2. Click "Run build"

**Option 3: AWS CLI**
```bash
aws amplify start-job \
  --app-id your-app-id \
  --branch-name main \
  --job-type RELEASE
```

### 6.2 Monitor Build

1. Go to Amplify Console
2. Click on the build in progress
3. View real-time logs

Build phases:
1. **Provision** (~30s) - Spin up build container
2. **Build** (~3-5min) - Install deps and build
3. **Deploy** (~1min) - Upload to S3 and invalidate CDN
4. **Verify** (~30s) - Health checks

### 6.3 Access Application

Once deployed, access at:
- Default: `https://main.d1234567890abc.amplifyapp.com`
- Custom: `https://assetql.com` (if configured)

## Step 7: Configure PR Previews (Optional)

### 7.1 Enable PR Previews

1. Go to App settings → Previews
2. Enable "Pull request previews"
3. Select branches to preview (e.g., `develop`, `feature/*`)

### 7.2 Configure GitHub Integration

1. Install AWS Amplify GitHub App
2. Grant access to repository
3. Configure webhook

### 7.3 Test PR Preview

1. Create a feature branch
2. Make changes
3. Open pull request
4. Amplify automatically creates preview URL
5. Comment on PR with preview link

## Step 8: Monitoring & Logging

### 8.1 Access Logs

1. Go to Amplify Console
2. Click "Monitoring" tab
3. View:
   - Build history
   - Deployment status
   - Error logs
   - Performance metrics

### 8.2 CloudWatch Integration

Amplify automatically sends logs to CloudWatch:

```bash
# View build logs
aws logs tail /aws/amplify/your-app-id --follow

# View access logs
aws logs tail /aws/amplify/your-app-id/access --follow
```

### 8.3 Set Up Alarms

```bash
# Create alarm for build failures
aws cloudwatch put-metric-alarm \
  --alarm-name AssetQL-Amplify-Build-Failures \
  --alarm-description "Alert on Amplify build failures" \
  --metric-name BuildFailures \
  --namespace AWS/Amplify \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Step 9: Performance Optimization

### 9.1 Enable Caching

Amplify automatically caches:
- Static assets (JS, CSS, images)
- Next.js build cache
- node_modules (between builds)

### 9.2 Configure Cache Headers

Add to `next.config.ts`:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|gif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 9.3 Enable Compression

Amplify automatically enables:
- Gzip compression
- Brotli compression (for supported browsers)

## Step 10: Security Configuration

### 10.1 Configure Security Headers

Add to `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install -g pnpm
        - pnpm install --frozen-lockfile
    build:
      commands:
        - pnpm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
  customHeaders:
    - pattern: '**/*'
      headers:
        - key: 'Strict-Transport-Security'
          value: 'max-age=31536000; includeSubDomains'
        - key: 'X-Frame-Options'
          value: 'DENY'
        - key: 'X-Content-Type-Options'
          value: 'nosniff'
        - key: 'X-XSS-Protection'
          value: '1; mode=block'
        - key: 'Referrer-Policy'
          value: 'strict-origin-when-cross-origin'
```

### 10.2 Configure CORS

Already configured in API Gateway, but verify:
- Amplify domain is allowed origin
- Credentials are included in requests

### 10.3 Enable WAF (Optional)

```bash
# Create WAF web ACL
aws wafv2 create-web-acl \
  --name AssetQL-Amplify-WAF \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --rules file://waf-rules.json

# Associate with Amplify CloudFront distribution
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/AssetQL-Amplify-WAF/a1b2c3d4 \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/E1234567890ABC
```

## Troubleshooting

### Build Fails: "pnpm: command not found"

**Solution:** Ensure `amplify.yml` installs pnpm:
```yaml
preBuild:
  commands:
    - npm install -g pnpm
```

### Build Fails: "Out of memory"

**Solution:** Increase Node memory:
```yaml
build:
  commands:
    - NODE_OPTIONS="--max-old-space-size=4096" pnpm run build
```

### Environment Variables Not Working

**Solution:**
1. Verify variables are set in Amplify Console
2. Check variable names start with `NEXT_PUBLIC_`
3. Redeploy after adding variables
4. Clear browser cache

### Custom Domain Not Working

**Solution:**
1. Verify DNS records are correct
2. Wait for SSL certificate provisioning (15-30 min)
3. Check domain verification status
4. Ensure domain is not already in use

### Slow Build Times

**Solution:**
1. Enable caching in `amplify.yml`
2. Use `pnpm install --frozen-lockfile`
3. Optimize dependencies
4. Consider using build image with more resources

## Cost Estimation

### Amplify Pricing (as of 2024)

**Build Minutes:**
- First 1,000 minutes/month: Free
- Additional: $0.01/minute
- Typical build: 3-5 minutes
- 100 builds/month: ~$3-5

**Hosting:**
- First 15 GB served/month: Free
- Additional: $0.15/GB
- Typical: 50 GB/month: ~$5.25

**Storage:**
- First 5 GB: Free
- Additional: $0.023/GB/month
- Typical: 2 GB: Free

**Total Monthly Cost:**
- Small app (100 builds, 50GB transfer): ~$8-10
- Medium app (500 builds, 200GB transfer): ~$30-40
- Large app (1000 builds, 500GB transfer): ~$80-100

### Cost Optimization Tips

1. **Reduce Build Frequency:**
   - Disable auto-build for feature branches
   - Use PR previews selectively

2. **Optimize Bundle Size:**
   - Enable tree shaking
   - Use dynamic imports
   - Compress images

3. **Use CloudFront Caching:**
   - Set appropriate cache headers
   - Enable compression

4. **Monitor Usage:**
   - Set up billing alerts
   - Review CloudWatch metrics

## Comparison: Amplify vs Vercel vs Self-Hosted

| Feature | AWS Amplify | Vercel | Self-Hosted (EC2) |
|---------|-------------|--------|-------------------|
| Setup Time | 15 min | 10 min | 2-4 hours |
| Monthly Cost | $8-40 | $0-20 (free tier) | $20-50 (EC2 + ALB) |
| Scalability | Auto | Auto | Manual |
| CI/CD | Built-in | Built-in | Setup required |
| SSL | Free | Free | ACM or Let's Encrypt |
| CDN | CloudFront | Edge Network | CloudFront extra |
| AWS Integration | Native | Limited | Full control |
| Maintenance | None | None | High |

## Best Practices

1. **Use Environment-Specific Branches:**
   - `main` → Production
   - `staging` → Staging environment
   - `develop` → Development environment

2. **Enable PR Previews:**
   - Test changes before merging
   - Share previews with team

3. **Monitor Build Times:**
   - Optimize dependencies
   - Use caching effectively

4. **Set Up Notifications:**
   - SNS for build failures
   - Slack integration

5. **Regular Updates:**
   - Keep dependencies updated
   - Monitor security advisories

6. **Backup Strategy:**
   - Git repository is source of truth
   - Amplify stores build artifacts

## Next Steps

1. ✅ Deploy to Amplify
2. ✅ Configure environment variables
3. ✅ Set up custom domain
4. ✅ Enable PR previews
5. ✅ Configure monitoring
6. ⏭️ Test production deployment
7. ⏭️ Set up staging environment
8. ⏭️ Configure CI/CD pipeline

## Support Resources

- **AWS Amplify Docs:** https://docs.aws.amazon.com/amplify/
- **Next.js on Amplify:** https://docs.amplify.aws/guides/hosting/nextjs/
- **Amplify CLI:** https://docs.amplify.aws/cli/
- **AWS Support:** https://console.aws.amazon.com/support/

---

**Status:** ✅ Ready for Amplify deployment
**Estimated Setup Time:** 15-30 minutes
**Recommended For:** Production deployments with AWS infrastructure
