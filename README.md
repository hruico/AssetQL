# AssetQL

AI-powered creative asset production automation platform for bulk, style-consistent image generation.

## Quick Start

### First-Time Setup (New Team Member)

```bash
# 1. Clone repository
git clone <repository-url>
cd AssetQL

# 2. Run setup (will ask for config from team lead)
./scripts/setup.sh

# 3. Start developing
./scripts/dev.sh
```

### Daily Development (Existing Setup)

```bash
# Start local frontend + monitor backend logs
./scripts/dev.sh

# Open http://localhost:3000
```

### Deploy to Production

```bash
# Build and deploy backend infrastructure
./scripts/deploy.sh

# Deploy frontend (auto-deploys on push)
git push origin main
```

## Project Structure

```
AssetQL/
├── scripts/              # All executable scripts
│   ├── setup.sh         # First-time setup
│   ├── dev.sh           # Development mode
│   ├── deploy.sh        # Production deployment
│   ├── build.sh         # Build Lambda functions
│   ├── build-layers.sh  # Build Lambda layers
│   └── watch-logs.sh    # Monitor backend logs
├── lambdas/             # Lambda function code
├── shared/              # Shared utilities
├── infra/               # Terraform infrastructure
├── frontend/            # Next.js frontend
├── config.private.sh    # Your private config (not in git)
└── README.md            # This file
```

## Scripts Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `./scripts/setup.sh` | First-time setup | Once after cloning |
| `./scripts/dev.sh` | Local development | Every dev session |
| `./scripts/deploy.sh` | Deploy backend | When backend changes |
| `./scripts/watch-logs.sh` | Monitor logs | Debugging |

## Configuration

### For New Team Members

Run `./scripts/setup.sh` and provide these values (get from team lead):

- API Gateway URL
- WebSocket URL  
- Cognito User Pool ID
- Cognito Client ID
- Amplify App ID

### For Team Leads

Share these values securely (Slack DM, not in code):

```bash
# Get from Terraform outputs
cd infra && terraform output

# Or from config.private.sh
cat config.private.sh
```

## Development Workflow

### 1. Local Development (Recommended)

```bash
# Start local frontend (FREE - no Amplify costs)
./scripts/dev.sh

# Frontend: http://localhost:3000
# Backend: Production AWS (pay per use only)
```

**Benefits:**
- ✅ No Amplify hosting costs
- ✅ Hot reload for instant changes
- ✅ Real-time backend log monitoring
- ✅ Full authentication and features

### 2. Backend Changes

```bash
# 1. Edit Lambda code in lambdas/

# 2. Deploy
./scripts/deploy.sh

# 3. Test locally
./scripts/dev.sh
```

### 3. Frontend Changes

```bash
# 1. Edit code in frontend/

# 2. Test locally (auto-reloads)
./scripts/dev.sh

# 3. Deploy to Amplify (when ready)
git push origin main
```

## Tech Stack

### Frontend
- Next.js 14 (React 18)
- TailwindCSS
- React Query
- AWS Cognito Auth

### Backend
- AWS Lambda (Node.js 20)
- API Gateway (REST)
- DynamoDB
- S3 + CloudFront
- SQS
- Bedrock (Nova Micro, Nova Lite, Stable Image Core)

### Infrastructure
- Terraform
- AWS Amplify (frontend hosting)

## Common Tasks

### View Logs

```bash
# All Lambda logs in real-time
./scripts/watch-logs.sh

# Filter for errors
./scripts/watch-logs.sh errors

# Filter by keyword
./scripts/watch-logs.sh "session"
```

### Update Dependencies

```bash
# Frontend
cd frontend
pnpm update

# Root
npm update
```

### Clean Build

```bash
# Remove all build artifacts
rm -rf dist/ layers/ frontend/.next/

# Rebuild
./scripts/build.sh
./scripts/build-layers.sh
```

## Troubleshooting

### "Configuration not found"

```bash
# Run setup again
./scripts/setup.sh
```

### "Port 3000 already in use"

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
cd frontend
PORT=3001 pnpm dev
```

### "Failed to fetch" in browser

1. Check `frontend/.env.local` exists
2. Verify API URL is correct
3. Check CORS headers in Lambda responses
4. View browser console for detailed error

### Terraform errors

```bash
# Reinitialize
cd infra
rm -rf .terraform
terraform init

# Rebuild layers
./scripts/build-layers.sh
```

## Security

### Never Commit

- ❌ `config.private.sh` (your actual config)
- ❌ `frontend/.env.local` (your actual env vars)
- ❌ AWS credentials
- ❌ Any secrets or API keys

### Safe to Commit

- ✅ `config.private.sh.example` (template)
- ✅ `frontend/.env.local.example` (template)
- ✅ All code files
- ✅ Documentation

## Cost Optimization

### Development

- **Local frontend**: $0 (runs on localhost)
- **Backend APIs**: Pay per use only
- **Savings**: ~$5-20/month vs. Amplify hosting

### Production

- **Amplify**: ~$0.15/GB + build minutes
- **Lambda**: Pay per invocation
- **Bedrock**: Nova models (50x cheaper than Claude)

## Documentation

- [Architecture Diagram](architecture-diagram.md)
- [API Documentation](BACKEND_API_IMPLEMENTATION.md)
- [Process Flow](ProcessFlowDiagram.md)
- [Implementation Plan](AssetQL_Implementation_Plan.md)

## Getting Help

1. Check this README
2. View logs: `./scripts/watch-logs.sh`
3. Check AWS Console (CloudWatch, Lambda)
4. Ask team lead

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally: `./scripts/dev.sh`
3. Commit: `git commit -m "feat: your feature"`
4. Push: `git push origin feature/your-feature`
5. Create Pull Request

---

**Built with ❤️ by the AssetQL team**
