#!/bin/bash

# AssetQL First-Time Setup
# Run this once after cloning the repository

set -e
clear

echo "╔════════════════════════════════════════╗"
echo "║   AssetQL First-Time Setup             ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js 20.x first."
    exit 1
fi
echo "✅ Node.js $(node --version)"

if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found. Installing..."
    npm install -g pnpm@10.30.3
fi
echo "✅ pnpm $(pnpm --version)"

if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found. Install Terraform first."
    exit 1
fi
echo "✅ Terraform $(terraform --version | head -1)"

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Install AWS CLI v2 first."
    exit 1
fi
echo "✅ AWS CLI $(aws --version | cut -d' ' -f1)"

# Check AWS credentials
echo ""
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured."
    echo ""
    echo "Run: aws configure"
    echo "Then run this script again."
    exit 1
fi
echo "✅ AWS credentials configured"

# Get configuration from team lead
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Configuration Required               ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "⚠️  You need configuration values from your team lead."
echo ""
read -p "Do you have the configuration values? (y/n): " has_config

if [[ ! $has_config =~ ^[Yy]$ ]]; then
    echo ""
    echo "📧 Contact your team lead to get:"
    echo "   - API Gateway URL"
    echo "   - WebSocket URL"
    echo "   - Cognito User Pool ID"
    echo "   - Cognito Client ID"
    echo "   - Amplify App ID"
    echo ""
    echo "Then run this script again."
    exit 0
fi

# Create config.private.sh
echo ""
echo "⚙️  Creating configuration file..."
if [ -f config.private.sh ]; then
    echo "⚠️  config.private.sh already exists. Skipping."
else
    echo ""
    read -p "API Gateway URL: " api_url
    read -p "WebSocket URL: " ws_url
    read -p "Cognito User Pool ID: " pool_id
    read -p "Cognito Client ID: " client_id
    read -p "Amplify App ID: " app_id
    
    cat > config.private.sh << EOF
#!/bin/bash
# AssetQL Private Configuration
# DO NOT COMMIT THIS FILE

export AWS_REGION="ap-south-1"
export AMPLIFY_APP_ID="$app_id"
export API_BASE_URL="$api_url"
export WEBSOCKET_URL="$ws_url"
export COGNITO_USER_POOL_ID="$pool_id"
export COGNITO_CLIENT_ID="$client_id"
export ASSETS_BUCKET="assetql-assets-dev"

echo "✅ Configuration loaded"
EOF
    
    chmod +x config.private.sh
    echo "✅ Created config.private.sh"
fi

# Create frontend .env.local
echo ""
echo "⚙️  Creating frontend environment file..."
if [ -f frontend/.env.local ]; then
    echo "⚠️  frontend/.env.local already exists. Skipping."
else
    source config.private.sh
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL
NEXT_PUBLIC_WEBSOCKET_URL=$WEBSOCKET_URL
NEXT_PUBLIC_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
NEXT_PUBLIC_COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID
NEXT_PUBLIC_AWS_REGION=$AWS_REGION
NEXT_PUBLIC_ASSETS_BUCKET=$ASSETS_BUCKET
EOF
    echo "✅ Created frontend/.env.local"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

cd frontend
pnpm install
cd ..

# Build Lambda functions
echo ""
echo "🔨 Building Lambda functions..."
./scripts/build.sh

# Build Lambda layers
echo ""
echo "🔨 Building Lambda layers..."
mkdir -p layers
./scripts/build-layers.sh

# Initialize Terraform
echo ""
echo "🏗️  Initializing Terraform..."
cd infra
terraform init
cd ..

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Setup Complete! ✅                   ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "  Development (local frontend):"
echo "    ./scripts/dev.sh"
echo ""
echo "  Deploy to production:"
echo "    ./scripts/deploy.sh"
echo ""
echo "Happy coding! 🚀"
echo ""
