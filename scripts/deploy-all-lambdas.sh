#!/bin/bash
set -e

echo "=== AssetQL Lambda Deployment Script ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}Project root: $PROJECT_ROOT${NC}"
echo ""

# List of Lambda functions to deploy
LAMBDAS=(
  "batch-creator"
  "feedback-handler"
  "action-refine-prompt"
  "action-get-feedback-ledger"
)

# Create deployment directory
DEPLOY_DIR="$PROJECT_ROOT/lambdas"
echo -e "${BLUE}Creating Lambda deployment packages...${NC}"
echo ""

# Package each Lambda
for lambda in "${LAMBDAS[@]}"; do
  echo -e "${GREEN}Packaging $lambda...${NC}"
  
  LAMBDA_DIR="$DEPLOY_DIR/$lambda"
  ZIP_FILE="$DEPLOY_DIR/$lambda.zip"
  
  if [ ! -d "$LAMBDA_DIR" ]; then
    echo -e "${RED}Error: Lambda directory not found: $LAMBDA_DIR${NC}"
    continue
  fi
  
  # Remove old zip if exists
  rm -f "$ZIP_FILE"
  
  # Create zip with Lambda code and shared module
  cd "$LAMBDA_DIR"
  zip -q "$ZIP_FILE" index.js
  
  # Add shared module
  cd "$PROJECT_ROOT"
  zip -qr "$ZIP_FILE" shared/
  
  echo -e "${GREEN}✓ Created $lambda.zip${NC}"
done

echo ""
echo -e "${BLUE}Applying Terraform changes...${NC}"
echo ""

# Navigate to infra directory
cd "$PROJECT_ROOT/infra"

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
  echo -e "${BLUE}Initializing Terraform...${NC}"
  terraform init
fi

# Plan and apply
echo -e "${BLUE}Planning Terraform changes...${NC}"
terraform plan -out=tfplan

echo ""
read -p "Apply these changes? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
  echo -e "${GREEN}Applying Terraform changes...${NC}"
  terraform apply tfplan
  rm tfplan
  
  echo ""
  echo -e "${GREEN}=== Deployment Complete ===${NC}"
  echo ""
  echo "Updated Lambdas:"
  for lambda in "${LAMBDAS[@]}"; do
    echo "  ✓ $lambda"
  done
  echo ""
  echo "API Gateway has been updated with new routes:"
  echo "  ✓ GET  /api/v1/feedback/{sessionId}"
  echo "  ✓ POST /api/v1/feedback/{sessionId}"
  echo "  ✓ GET  /api/v1/feedback/{sessionId}/assets"
  echo ""
else
  echo -e "${RED}Deployment cancelled${NC}"
  rm tfplan
  exit 1
fi
