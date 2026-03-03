#!/bin/bash

# Quick Lambda Deploy Script
# Usage: ./scripts/deploy-lambda.sh <lambda-name>
# Example: ./scripts/deploy-lambda.sh style-embedding

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/deploy-lambda.sh <lambda-name>"
    echo ""
    echo "Available Lambdas:"
    ls -1 lambdas/ | grep -v ".zip"
    exit 1
fi

LAMBDA_NAME=$1
REGION=${AWS_REGION:-ap-south-1}
ENV=${ENVIRONMENT:-dev}

# Convert kebab-case to PascalCase for AWS function name
# e.g., style-embedding -> StyleEmbedding
FUNCTION_NAME="AssetQL-$(echo $LAMBDA_NAME | sed -r 's/(^|-)([a-z])/\U\2/g')-$ENV"

echo "╔════════════════════════════════════════╗"
echo "║   Quick Lambda Deploy                  ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Lambda: $LAMBDA_NAME"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo ""

# Check if Lambda exists
if [ ! -d "lambdas/$LAMBDA_NAME" ]; then
    echo "❌ Lambda not found: lambdas/$LAMBDA_NAME"
    exit 1
fi

# Validate crypto import
echo "🔍 Validating..."
if grep -q "crypto\.randomUUID" "lambdas/$LAMBDA_NAME/index.js" && ! grep -q "require('crypto')" "lambdas/$LAMBDA_NAME/index.js"; then
    echo "❌ Missing: const crypto = require('crypto');"
    exit 1
fi

# Build
echo "🔨 Building..."
mkdir -p "dist/$LAMBDA_NAME"
npx esbuild "lambdas/$LAMBDA_NAME/index.js" \
  --bundle \
  --platform=node \
  --target=node20 \
  --external:@aws-sdk/* \
  --external:uuid \
  --external:sharp \
  --external:archiver \
  --outfile="dist/$LAMBDA_NAME/index.js" \
  --log-level=error

# Zip
echo "📦 Packaging..."
cd "dist/$LAMBDA_NAME" && zip -q -r "../../dist/$LAMBDA_NAME.zip" . && cd ../..

# Deploy
echo "🚀 Deploying to AWS..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://dist/$LAMBDA_NAME.zip" \
  --region "$REGION" \
  --output json > /dev/null

# Wait for update to complete
echo "⏳ Waiting for deployment..."
aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION"

echo ""
echo "✅ Deployed successfully!"
echo ""
echo "Test with:"
echo "  aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"
echo ""
