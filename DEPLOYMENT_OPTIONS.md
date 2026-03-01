# AssetQL Frontend Deployment Options - Quick Reference

## Overview

Choose the deployment option that best fits your needs. All options support the full AssetQL feature set.

## Comparison Matrix

| Feature | AWS Amplify | Vercel | Self-Hosted (Docker) |
|---------|-------------|--------|---------------------|
| **Setup Time** | 15-30 min | 10 min | 2-4 hours |
| **Monthly Cost** | $8-40 | $0-20 | $20-50+ |
| **AWS Integration** | ⭐⭐⭐⭐⭐ Native | ⭐⭐ Limited | ⭐⭐⭐⭐⭐ Full |
| **CI/CD** | ✅ Built-in | ✅ Built-in | ❌ Manual setup |
| **SSL/HTTPS** | ✅ Free (ACM) | ✅ Free | ✅ Free (Let's Encrypt) |
| **CDN** | ✅ CloudFront | ✅ Edge Network | ⚠️ Extra cost |
| **Scalability** | ✅ Auto | ✅ Auto | ⚠️ Manual |
| **Maintenance** | ✅ None | ✅ None | ❌ High |
| **Custom Domain** | ✅ Yes | ✅ Yes | ✅ Yes |
| **PR Previews** | ✅ Yes | ✅ Yes | ❌ No |
| **Region Control** | ✅ Same as backend | ❌ Global | ✅ Full control |
| **Monitoring** | ✅ CloudWatch | ✅ Built-in | ⚠️ Setup required |

## Recommendation by Use Case

### 🏆 Production with AWS Infrastructure
**Choose: AWS Amplify**
- Native AWS integration
- Same region as backend (lower latency)
- Unified billing and monitoring
- Enterprise-grade security
- Cost-effective at scale

**Setup:** [AWS_AMPLIFY_DEPLOYMENT.md](./AWS_AMPLIFY_DEPLOYMENT.md)

### ⚡ Fastest Time to Market
**Choose: Vercel**
- Deploy in 10 minutes
- Excellent developer experience
- Free tier for testing
- Global edge network
- Best for MVP/prototypes

**Setup:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#option-b-deploy-to-vercel)

### 🔧 Maximum Control & Customization
**Choose: Self-Hosted (Docker)**
- Full infrastructure control
- Custom networking setup
- VPC integration
- Compliance requirements
- Cost optimization at scale

**Setup:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#option-d-self-host-with-docker)

## Quick Start Guides

### AWS Amplify (Recommended)

```bash
# 1. Ensure amplify.yml exists (already created)
ls frontend/amplify.yml

# 2. Push to GitHub
git add .
git commit -m "Deploy to Amplify"
git push origin main

# 3. Deploy via Console
# - Go to AWS Amplify Console
# - Click "New app" → "Host web app"
# - Connect GitHub repository
# - Select branch: main
# - Monorepo root: frontend
# - Add environment variables
# - Deploy!
```

**Time:** 15-30 minutes  
**Cost:** ~$8-40/month  
**Docs:** [AWS_AMPLIFY_DEPLOYMENT.md](./AWS_AMPLIFY_DEPLOYMENT.md)

### Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
cd frontend
vercel --prod

# 3. Add environment variables in Vercel dashboard
# 4. Done!
```

**Time:** 10 minutes  
**Cost:** $0-20/month  
**Docs:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#option-b-deploy-to-vercel)

### Docker (Self-Hosted)

```bash
# 1. Build Docker image
cd frontend
docker build -t assetql-frontend .

# 2. Run container
docker run -p 3000:3000 --env-file .env.local assetql-frontend

# 3. Set up reverse proxy (nginx/ALB)
# 4. Configure SSL
# 5. Set up monitoring
```

**Time:** 2-4 hours  
**Cost:** $20-50+/month  
**Docs:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#option-d-self-host-with-docker)

## Cost Breakdown

### AWS Amplify
```
Build minutes: $0.01/min
- 100 builds/month × 4 min = $4

Hosting: $0.15/GB
- 50 GB transfer = $7.50

Storage: $0.023/GB/month
- 2 GB = Free (under 5GB)

Total: ~$11.50/month
```

### Vercel
```
Free Tier:
- 100 GB bandwidth
- Unlimited builds
- 1 concurrent build

Pro ($20/month):
- 1 TB bandwidth
- Unlimited builds
- 3 concurrent builds

Total: $0-20/month
```

### Self-Hosted (AWS)
```
EC2 t3.small: $15/month
Application Load Balancer: $16/month
CloudFront: $5-10/month
Route 53: $0.50/month
ACM SSL: Free

Total: ~$36.50+/month
```

## Environment Variables Required

All deployment options require these environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://xxx.execute-api.ap-south-1.amazonaws.com/dev/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=wss://xxx.execute-api.ap-south-1.amazonaws.com/dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_S3_BUCKET=assetql-assets-xxxxx
NEXT_PUBLIC_CLOUDFRONT_URL=https://xxx.cloudfront.net
```

Get these values by running:
```bash
cd frontend
./scripts/setup-env.sh
cat .env.local
```

## Performance Comparison

### Build Time
- **Vercel:** 2-3 minutes ⚡
- **Amplify:** 3-5 minutes ⚡
- **Docker:** 5-10 minutes ⚠️

### Cold Start
- **Vercel:** ~100ms ⚡
- **Amplify:** ~150ms ⚡
- **Docker:** ~200ms ⚠️

### Global Latency
- **Vercel:** 50-100ms (edge network) ⚡
- **Amplify:** 100-200ms (CloudFront) ⚡
- **Docker:** 200-500ms (single region) ⚠️

### Same-Region Latency (to backend)
- **Amplify:** 10-50ms ⚡⚡⚡
- **Docker:** 10-50ms ⚡⚡⚡
- **Vercel:** 100-200ms ⚠️

## Security Comparison

### SSL/TLS
- **All:** ✅ Free HTTPS certificates
- **Amplify:** AWS Certificate Manager
- **Vercel:** Let's Encrypt
- **Docker:** Let's Encrypt or ACM

### DDoS Protection
- **Amplify:** ✅ AWS Shield Standard (free)
- **Vercel:** ✅ Built-in
- **Docker:** ⚠️ Requires AWS Shield or CloudFlare

### WAF (Web Application Firewall)
- **Amplify:** ✅ Easy integration with AWS WAF
- **Vercel:** ⚠️ Limited
- **Docker:** ✅ Full AWS WAF integration

### Compliance
- **Amplify:** ✅ SOC, PCI, HIPAA eligible
- **Vercel:** ✅ SOC 2 Type II
- **Docker:** ✅ Full control (your responsibility)

## Monitoring & Observability

### Built-in Monitoring
- **Amplify:** ✅ CloudWatch integration
- **Vercel:** ✅ Analytics dashboard
- **Docker:** ❌ Manual setup required

### Custom Metrics
- **Amplify:** ✅ CloudWatch custom metrics
- **Vercel:** ⚠️ Limited
- **Docker:** ✅ Full control (Prometheus, etc.)

### Logging
- **Amplify:** ✅ CloudWatch Logs
- **Vercel:** ✅ Real-time logs
- **Docker:** ✅ Custom logging (ELK, etc.)

## Scaling Capabilities

### Automatic Scaling
- **Amplify:** ✅ Automatic (CloudFront + S3)
- **Vercel:** ✅ Automatic (edge network)
- **Docker:** ⚠️ Manual (ECS/EKS required)

### Traffic Handling
- **Amplify:** Unlimited (CloudFront)
- **Vercel:** Unlimited (edge network)
- **Docker:** Limited by instance size

### Geographic Distribution
- **Amplify:** ✅ CloudFront edge locations
- **Vercel:** ✅ Global edge network
- **Docker:** ⚠️ Single region (multi-region extra)

## CI/CD Integration

### Git Integration
- **Amplify:** ✅ GitHub, GitLab, Bitbucket
- **Vercel:** ✅ GitHub, GitLab, Bitbucket
- **Docker:** ⚠️ Manual setup (GitHub Actions, etc.)

### PR Previews
- **Amplify:** ✅ Automatic preview deployments
- **Vercel:** ✅ Automatic preview deployments
- **Docker:** ❌ Not available

### Rollback
- **Amplify:** ✅ One-click rollback
- **Vercel:** ✅ One-click rollback
- **Docker:** ⚠️ Manual process

## Decision Tree

```
Start Here
    |
    ├─ Need AWS integration? ──YES──> AWS Amplify ⭐
    |                          |
    |                          NO
    |                          |
    ├─ Need fastest setup? ────YES──> Vercel ⚡
    |                          |
    |                          NO
    |                          |
    ├─ Need full control? ─────YES──> Docker 🔧
    |                          |
    |                          NO
    |                          |
    └─ Default recommendation ────────> AWS Amplify ⭐
```

## Migration Path

### From Vercel to Amplify
1. Export environment variables
2. Create Amplify app
3. Connect same repository
4. Import environment variables
5. Deploy
6. Update DNS (if custom domain)

**Downtime:** ~5 minutes

### From Docker to Amplify
1. Ensure code is in Git repository
2. Create Amplify app
3. Configure build settings
4. Add environment variables
5. Deploy
6. Update DNS/load balancer

**Downtime:** ~10 minutes

### From Amplify to Vercel
1. Export environment variables
2. Connect repository to Vercel
3. Import environment variables
4. Deploy
5. Update DNS (if custom domain)

**Downtime:** ~5 minutes

## Support & Resources

### AWS Amplify
- **Docs:** https://docs.aws.amazon.com/amplify/
- **Support:** AWS Support (paid)
- **Community:** AWS Forums
- **SLA:** 99.95% uptime

### Vercel
- **Docs:** https://vercel.com/docs
- **Support:** Email (Pro+), Discord
- **Community:** GitHub Discussions
- **SLA:** 99.99% uptime (Enterprise)

### Docker (Self-Hosted)
- **Docs:** Your infrastructure docs
- **Support:** Your team
- **Community:** Docker community
- **SLA:** Your responsibility

## Final Recommendation

### For AssetQL Production Deployment:

**🏆 AWS Amplify** is recommended because:

1. ✅ Native integration with existing AWS infrastructure
2. ✅ Same region as backend (ap-south-1) = lower latency
3. ✅ Unified AWS billing and monitoring
4. ✅ Enterprise-grade security and compliance
5. ✅ Cost-effective at scale (~$8-40/month)
6. ✅ Built-in CI/CD with PR previews
7. ✅ Easy to set up (15-30 minutes)
8. ✅ Minimal maintenance required

**Get Started:** [AWS_AMPLIFY_DEPLOYMENT.md](./AWS_AMPLIFY_DEPLOYMENT.md)

---

**Last Updated:** Phase 2.5 Complete  
**Status:** All deployment options tested and documented  
**Recommended:** AWS Amplify for production
