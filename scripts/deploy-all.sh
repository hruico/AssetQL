#!/bin/bash

# Deploy All Lambda Functions
# Builds and deploys all Lambda functions to AWS

set -e

REGION=${AWS_REGION:-ap-south-1}
ENV=${ENVIRONMENT:-dev}

echo "╔════════════════════════════════════════╗"
echo "║   Deploy All Lambda Functions          ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Region: $REGION"
echo "Environment: $ENV"
echo ""

# Build all Lambdas
./scripts/build.sh

echo ""
echo "🚀 Deploying to AWS..."
echo ""

# Get list of all Lambda directories
lambdas=($(ls -d lambdas/*/ | xargs -n 1 basename))

deployed=0
failed=0

for lambda in "${lambdas[@]}"; do
    # Convert kebab-case to PascalCase
    function_name="AssetQL-$(echo $lambda | sed -r 's/(^|-)([a-z])/\U\2/g')-$ENV"
    
    echo "  Deploying $lambda..."
    
    if aws lambda update-function-code \
        --function-name "$function_name" \
        --zip-file "fileb://lambdas/$lambda.zip" \
        --region "$REGION" \
        --output json > /dev/null 2>&1; then
        deployed=$((deployed + 1))
    else
        echo "    ⚠️  Failed (function may not exist)"
        failed=$((failed + 1))
    fi
done

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Deployment Complete!                 ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "✅ Deployed: $deployed"
if [ $failed -gt 0 ]; then
    echo "⚠️  Skipped: $failed (functions don't exist in AWS)"
fi
echo ""
echo "Note: Functions are updating in the background."
echo "      It may take 10-30 seconds for changes to be live."
echo ""
