# Getting Started with AssetQL

## For New Team Members

### Step 1: Prerequisites

Install these first:
- Node.js 20.x
- pnpm
- Terraform
- AWS CLI v2

### Step 2: Get Configuration

Contact your team lead for:
- API Gateway URL
- WebSocket URL
- Cognito User Pool ID
- Cognito Client ID
- Amplify App ID
- AWS credentials

### Step 3: Setup

```bash
git clone <repository-url>
cd AssetQL
./scripts/setup.sh
```

The script will ask for the configuration values.

### Step 4: Start Developing

```bash
./scripts/dev.sh
```

Open http://localhost:3000

Done! 🎉

## For Existing Team Members

### Daily Development

```bash
./scripts/dev.sh
```

### Deploy Changes

```bash
./scripts/deploy.sh
```

## Need Help?

See [README.md](README.md) for detailed documentation.
