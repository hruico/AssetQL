# AssetQL Quick Start Guide

## 🚀 Deploy in 30 Minutes

### Prerequisites
- AWS Account
- GitHub repository
- Terraform installed
- Node.js 20+ and pnpm

---

## Step 1: Deploy Backend (10 min)

```bash
# Clone repository
git clone https://github.com/your-org/assetql.git
cd assetql

# Deploy infrastructure
cd infra
terraform init
terraform apply  # Type 'yes' when prompted

# Save outputs
terraform output > ../outputs.txt
```

**What this does:**
- Creates 7 DynamoDB tables
- Deploys 7 Lambda functions
- Sets up API Gateway
- Configures Cognito authentication
- Creates S3 buckets
- Sets up Bedrock Agents

---

## Step 2: Configure Frontend (5 min)

```bash
# Setup environment
cd ../frontend
./scripts/setup-env.sh

# Install dependencies
pnpm install

# Test locally (optional)
pnpm dev
# Open http://localhost:3000
```

**What this does:**
- Fetches Terraform outputs
- Creates `.env.local` with all variables
- Installs frontend dependencies

---

## Step 3: Deploy Frontend (15 min)

### Option A: AWS Amplify (Recommended)

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

2. **Deploy via AWS Console**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect GitHub repository
   - Select branch: `main`
   - Monorepo root: `frontend`
   - Click "Next"

3. **Add Environment Variables**
   - Copy from `.env.local`
   - Paste into Amplify Console
   - Click "Save and deploy"

4. **Wait for deployment** (~5 minutes)
   - Build: 3-5 minutes
   - Deploy: 1 minute
   - Done! 🎉

**Your app is live at:** `https://main.xxxxx.amplifyapp.com`

### Option B: Vercel (Fastest)

```bash
npm i -g vercel
cd frontend
vercel --prod
# Follow prompts and add environment variables
```

---

## Step 4: Test Your Deployment (5 min)

1. **Open your app URL**
2. **Sign up** for a new account
3. **Verify email** (check inbox)
4. **Login** with credentials
5. **Create a session**
6. **Upload a style profile**
7. **Done!** ✅

---

## 📚 Documentation

| Guide | Purpose | Time |
|-------|---------|------|
| [AWS_AMPLIFY_DEPLOYMENT.md](./AWS_AMPLIFY_DEPLOYMENT.md) | Detailed Amplify setup | 30 min |
| [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md) | Compare deployment options | 5 min |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Complete deployment guide | 15 min |
| [BACKEND_API_IMPLEMENTATION.md](./BACKEND_API_IMPLEMENTATION.md) | Backend technical details | 10 min |

---

## 🆘 Troubleshooting

### Frontend can't connect to API
```bash
# Check environment variables
cat frontend/.env.local

# Verify API Gateway is deployed
cd infra
terraform output api_gateway_url
```

### Authentication fails
```bash
# Verify Cognito configuration
cd infra
terraform output cognito_user_pool_id
terraform output cognito_client_id

# Check user is confirmed in Cognito Console
```

### Build fails on Amplify
- Check `amplify.yml` exists in `frontend/`
- Verify monorepo root is set to `frontend`
- Check build logs in Amplify Console

---

## 💰 Cost Estimate

**Monthly costs for 100 users:**

| Service | Cost |
|---------|------|
| Lambda | $5-10 |
| DynamoDB | $5-10 |
| API Gateway | $3-5 |
| S3 | $5-10 |
| Bedrock | $50-100 |
| Amplify | $8-40 |
| **Total** | **$76-175** |

---

## 🎯 What You Get

✅ **Authentication System**
- User signup/login
- Email verification
- Password reset
- JWT-based auth

✅ **Session Management**
- Create sessions
- List all sessions
- View session details
- Phase transitions

✅ **Style Profile Management**
- Upload reference images
- AI-powered style analysis
- List all profiles
- View profile details

✅ **Production-Ready**
- Serverless architecture
- Auto-scaling
- Global CDN
- SSL/HTTPS
- Monitoring

---

## 📊 Current Status

- **Overall:** 70% complete
- **Phase 1:** ✅ Authentication (100%)
- **Phase 2:** ✅ Session & Style Management (100%)
- **Phase 2.5:** ✅ Backend API Integration (100%)
- **Phase 3:** 🚧 Asset Library (0%)
- **Phase 4:** 🚧 Polish & Production (40%)

---

## 🔜 Coming Next (Phase 3)

- Asset library with grid view
- Real-time WebSocket updates
- CSV upload for bulk generation
- Batch management
- Export functionality

---

## 🤝 Support

- **Documentation:** See links above
- **Issues:** GitHub Issues
- **Email:** support@assetql.com

---

## 🎉 Success!

Your AssetQL platform is now live and ready to use!

**Next steps:**
1. Invite team members
2. Create your first session
3. Upload style profiles
4. Start generating assets

**Need help?** Check the documentation links above or open an issue.

---

**Last Updated:** Phase 2.5 Complete  
**Deployment Time:** ~30 minutes  
**Status:** Production Ready ✅
