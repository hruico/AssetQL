# AssetQL Frontend Quick Start

Get the frontend running in 3 steps.

## Prerequisites

- Node.js 20+ installed
- pnpm installed (`npm install -g pnpm`)
- AWS infrastructure deployed via Terraform

## Step 1: Install Dependencies

```bash
pnpm install
```

## Step 2: Configure Environment

### Option A: Automated Setup (Recommended)

Run the setup script to automatically fetch Terraform outputs:

```bash
./scripts/setup-env.sh
```

This will:
- Create `.env.local` from `.env.example`
- Fetch API Gateway URL from Terraform
- Fetch WebSocket URL from Terraform
- Fetch Cognito User Pool ID and Client ID from Terraform

### Option B: Manual Setup

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Get Terraform outputs:
```bash
cd ../infra
terraform output
```

3. Update `.env.local` with the values:
   - `api_base_url` → `NEXT_PUBLIC_API_BASE_URL`
   - `websocket_api_endpoint` → `NEXT_PUBLIC_WEBSOCKET_URL`
   - `cognito_user_pool_id` → `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
   - `cognito_client_id` → `NEXT_PUBLIC_COGNITO_CLIENT_ID`

## Step 3: Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Verify Setup

The app should:
- Load without errors
- Show the AssetQL landing page
- Allow you to navigate to login/signup (once those pages are created)

## Troubleshooting

### "No current user" error
- Ensure Cognito User Pool ID and Client ID are correct
- Check that the user pool exists in AWS Console

### API calls fail with 401
- Verify the API Gateway URL is correct
- Ensure you're signed in with a valid Cognito user
- Check that the Cognito authorizer is configured in API Gateway

### CORS errors
- Verify API Gateway has CORS configured for all endpoints
- Check that `Access-Control-Allow-Origin: *` is set in API responses

## Next Steps

1. Create authentication pages (`/login`, `/signup`)
2. Build the dashboard UI
3. Implement session management
4. Add batch creation workflow
5. Integrate WebSocket for real-time updates

## Useful Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Environment
./scripts/setup-env.sh  # Update .env.local from Terraform
```

## Project Structure

```
frontend/
├── app/                    # Next.js pages
├── lib/
│   ├── auth/              # Cognito authentication
│   ├── context/           # React contexts (AuthContext)
│   ├── types/             # TypeScript types
│   └── api/               # API client
├── scripts/               # Setup scripts
├── .env.local             # Environment variables (gitignored)
└── .env.example           # Environment template
```
