#!/bin/bash

# AssetQL Production Deployment
# Builds and deploys backend infrastructure

set -e
clear

echo "╔════════════════════════════════════════╗"
echo "║   AssetQL Production Deployment        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if config exists
if [ ! -f config.private.sh ]; then
    echo "❌ Configuration not found!"
    echo ""
    echo "Run first-time setup:"
    echo "  ./scripts/setup.sh"
    exit 1
fi

# Load configuration
source config.private.sh

echo "⚠️  WARNING: This will deploy to production AWS!"
echo ""
echo "Target:"
echo "  Region: $AWS_REGION"
echo "  Environment: dev"
echo ""
read -p "Continue? (y/n): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Build Lambda functions
echo ""
echo "🔨 Building Lambda functions..."
./scripts/build.sh

# Build Lambda layers
echo ""
echo "🔨 Building Lambda layers..."
mkdir -p layers
./scripts/build-layers.sh

# Deploy with Terraform
echo ""
echo "🚀 Deploying infrastructure..."
cd infra
terraform apply

# Get outputs
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Deployment Complete! ✅              ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Outputs:"
terraform output

cd ..

echo ""
echo "Next steps:"
echo ""
echo "  Test deployment:"
echo "    curl \$API_BASE_URL"
echo ""
echo "  Monitor logs:"
echo "    ./watch-logs.sh"
echo ""
echo "  Deploy frontend to Amplify:"
echo "    git push origin main"
echo ""
