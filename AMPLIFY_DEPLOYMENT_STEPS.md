# AssetQL AWS Amplify Deployment - Step by Step

## ✅ Backend Deployment Complete

Your backend infrastructure is successfully deployed with these endpoints:

- **API Base URL**: `https://uro07dkgbb.execute-api.ap-south-1.amazonaws.com/dev/api/v1`
- **WebSocket URL**: `wss://o1w7hw0rkb.execute-api.ap-south-1.amazonaws.com/dev`
- **Cognito User Pool ID**: `ap-south-1_xnE6jcOli`
- **Cognito Client ID**: `2fmlhb5pbvjsp9t849h40r9h5i`
- **S3 Bucket**: `assetql-assets-dev`
- **AWS Region**: `ap-south-1`

## 📋 Frontend Deployment Steps

### Step 1: Push Code to GitHub (if not already done)

```bash
# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Amplify deployment"

# Add remote (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/AssetQL.git

# Push to main branch
git push -u origin main
```

### Step 2: Deploy to AWS Amplify Console

1. **Open AWS Amplify Console**
   - Go to: https://console.aws.amazon.com/amplify/
   - Region: **ap-south-1 (Mumbai)** - Same as your backend!

2. **Create New App**
   - Click "New app" → "Host web app"
   - Select your Git provider (GitHub/GitLab/Bitbucket)
   - Click "Continue"

3. **Authorize AWS Amplify**
   - Grant AWS Amplify access to your repository
   - Select the AssetQL repository
   - Click "Next"

4. **Configure Build Settings**
   - **App name**: `AssetQL-Frontend`
   - **Branch**: `main`
   - **Enable monorepo**: ✅ YES
   - **Monorepo app root**: `frontend`
   - Build settings will be auto-detected from `frontend/amplify.yml`
   - Click "Next"

5. **Add Environment Variables**
   
   Click "Advanced settings" and add these variables:

   | Variable Name | Value |
   |--------------|-------|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://uro07dkgbb.execute-api.ap-south-1.amazonaws.com/dev/api/v1` |
   | `NEXT_PUBLIC_WEBSOCKET_URL` | `wss://o1w7hw0rkb.execute-api.ap-south-1.amazonaws.com/dev` |
   | `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `ap-south-1_xnE6jcOli` |
   | `NEXT_PUBLIC_COGNITO_CLIENT_ID` | `2fmlhb5pbvjsp9t849h40r9h5i` |
   | `NEXT_PUBLIC_AWS_REGION` | `ap-south-1` |
   | `NEXT_PUBLIC_ASSETS_BUCKET` | `assetql-assets-dev` |

6. **Review and Deploy**
   - Review all settings
   - Click "Save and deploy"
   - Wait for deployment (3-5 minutes)

### Step 3: Monitor Deployment

Watch the build progress in the Amplify Console:

1. **Provision** (~30 seconds) - Setting up build environment
2. **Build** (~3-5 minutes) - Installing dependencies and building
3. **Deploy** (~1 minute) - Uploading to S3 and CloudFront
4. **Verify** (~30 seconds) - Running health checks

### Step 4: Access Your Application

Once deployment completes, you'll get a URL like:
```
https://main.d1234567890abc.amplifyapp.com
```

## 🧪 Testing Your Deployment

1. **Open the Amplify URL** in your browser

2. **Test Authentication**
   - Click "Sign Up"
   - Create a test account
   - Verify email (check spam folder)
   - Log in

3. **Test Dashboard**
   - Navigate to Dashboard
   - Verify API connectivity
   - Check if data loads correctly

4. **Test Session Creation**
   - Try creating a new session
   - Verify WebSocket connection

## 🔧 Troubleshooting

### Build Fails: "pnpm: command not found"
✅ Already fixed in `amplify.yml` - it installs pnpm automatically

### Build Fails: "Out of memory"
Add this to `amplify.yml` build commands:
```yaml
- NODE_OPTIONS="--max-old-space-size=4096" pnpm run build
```

### Environment Variables Not Working
1. Go to Amplify Console → App settings → Environment variables
2. Verify all variables are set correctly
3. Redeploy: Click "Redeploy this version"

### API Calls Failing (CORS errors)
Check that your API Gateway has CORS enabled for the Amplify domain:
- Go to API Gateway console
- Check CORS configuration
- Add Amplify domain to allowed origins if needed

## 📊 Expected Costs

### AWS Amplify Pricing (Monthly)

**Build Minutes:**
- First 1,000 minutes: Free
- Your usage: ~100 builds × 4 min = 400 min
- Cost: **Free** (under 1,000 min)

**Hosting:**
- First 15 GB served: Free
- Estimated: 50 GB/month
- Cost: 35 GB × $0.15 = **$5.25**

**Storage:**
- First 5 GB: Free
- Your usage: ~2 GB
- Cost: **Free**

**Total Estimated Cost: ~$5-10/month**

## 🚀 Optional: Custom Domain

### Add Custom Domain (e.g., assetql.com)

1. **In Amplify Console**
   - Go to "Domain management"
   - Click "Add domain"
   - Enter your domain name

2. **Configure DNS**
   - Amplify will provide DNS records
   - Add them to your DNS provider (Route 53, GoDaddy, etc.)
   - Wait for SSL certificate provisioning (15-30 minutes)

3. **Verify**
   - Once SSL is ready, your app will be available at your custom domain
   - HTTPS is automatically configured

## 📈 Monitoring & Logs

### View Build Logs
1. Go to Amplify Console
2. Click on your app
3. Click on a build
4. View real-time logs

### View Application Logs
1. Go to CloudWatch
2. Navigate to Log groups
3. Find `/aws/amplify/your-app-id`

### Set Up Alerts
1. Go to CloudWatch Alarms
2. Create alarm for build failures
3. Configure SNS notification

## 🔄 Continuous Deployment

Every time you push to the `main` branch:
1. Amplify automatically detects the change
2. Triggers a new build
3. Deploys the new version
4. Your app is updated (zero downtime)

## 📝 Next Steps

1. ✅ Deploy to Amplify
2. ✅ Test authentication
3. ✅ Test API connectivity
4. ⏭️ Set up custom domain (optional)
5. ⏭️ Enable PR previews for feature branches
6. ⏭️ Configure monitoring and alerts
7. ⏭️ Set up staging environment

## 📚 Additional Resources

- **Full Deployment Guide**: [AWS_AMPLIFY_DEPLOYMENT.md](./AWS_AMPLIFY_DEPLOYMENT.md)
- **Deployment Options**: [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md)
- **Frontend Setup**: [frontend/QUICKSTART.md](./frontend/QUICKSTART.md)
- **AWS Amplify Docs**: https://docs.aws.amazon.com/amplify/

---

**Status**: ✅ Ready for deployment  
**Estimated Time**: 15-30 minutes  
**Difficulty**: Easy  
**Cost**: ~$5-10/month

Good luck with your deployment! 🚀
