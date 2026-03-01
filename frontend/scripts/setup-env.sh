#!/bin/bash

# Script to extract Terraform outputs and populate .env.local

echo "🔧 AssetQL Frontend Environment Setup"
echo "======================================"
echo ""

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first."
    exit 1
fi

# Check if infra directory exists
if [ ! -d "../infra" ]; then
    echo "❌ Infrastructure directory not found. Please run this from the frontend directory."
    exit 1
fi

echo "📡 Fetching Terraform outputs..."
cd ../infra

# Get Terraform outputs
API_BASE_URL=$(terraform output -raw api_base_url 2>/dev/null)
WEBSOCKET_URL=$(terraform output -raw websocket_api_endpoint 2>/dev/null)
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null)
CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null)

cd ../frontend

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
else
    echo "ℹ️  .env.local already exists, updating values..."
fi

# Update .env.local with Terraform outputs
if [ ! -z "$API_BASE_URL" ]; then
    sed -i.bak "s|NEXT_PUBLIC_API_BASE_URL=.*|NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL|" .env.local
    echo "✅ Updated API_BASE_URL: $API_BASE_URL"
fi

if [ ! -z "$WEBSOCKET_URL" ]; then
    sed -i.bak "s|NEXT_PUBLIC_WEBSOCKET_URL=.*|NEXT_PUBLIC_WEBSOCKET_URL=$WEBSOCKET_URL|" .env.local
    echo "✅ Updated WEBSOCKET_URL: $WEBSOCKET_URL"
fi

if [ ! -z "$USER_POOL_ID" ]; then
    sed -i.bak "s|NEXT_PUBLIC_COGNITO_USER_POOL_ID=.*|NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID|" .env.local
    echo "✅ Updated COGNITO_USER_POOL_ID: $USER_POOL_ID"
fi

if [ ! -z "$CLIENT_ID" ]; then
    sed -i.bak "s|NEXT_PUBLIC_COGNITO_CLIENT_ID=.*|NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID|" .env.local
    echo "✅ Updated COGNITO_CLIENT_ID: $CLIENT_ID"
fi

# Clean up backup file
rm -f .env.local.bak

echo ""
echo "✅ Environment setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update NEXT_PUBLIC_CLOUDFRONT_URL in .env.local (if CloudFront is deployed)"
echo "   2. Run 'pnpm dev' to start the development server"
echo ""
