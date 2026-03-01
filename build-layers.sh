#!/bin/bash

echo "Building Lambda Layers..."

# Clean old layer builds
rm -rf layers-dist
mkdir -p layers-dist

# Layer 1: Common Dependencies (AWS SDK + uuid)
echo "Building common-dependencies layer..."
mkdir -p layers-dist/common-dependencies/nodejs
cd layers-dist/common-dependencies/nodejs

# Install common dependencies
npm init -y
npm install \
  @aws-sdk/client-dynamodb@^3.1000.0 \
  @aws-sdk/lib-dynamodb@^3.1000.0 \
  @aws-sdk/client-s3@^3.1000.0 \
  @aws-sdk/client-sqs@^3.1000.0 \
  @aws-sdk/client-bedrock-runtime@^3.1000.0 \
  @aws-sdk/client-bedrock-agent-runtime@^3.1000.0 \
  @aws-sdk/client-apigatewaymanagementapi@^3.1000.0 \
  uuid@^13.0.0

# Remove package.json and package-lock.json (not needed in layer)
rm package.json package-lock.json

cd ../../..
cd layers-dist/common-dependencies && zip -r ../../layers/common-dependencies.zip . && cd ../..

echo "✓ Common dependencies layer built"

# Layer 2: Image Processing Dependencies (sharp + archiver + presigner)
echo "Building image-processing layer..."
mkdir -p layers-dist/image-processing/nodejs
cd layers-dist/image-processing/nodejs

# Install image processing dependencies
npm init -y
npm install \
  sharp@^0.34.5 \
  archiver@^7.0.1 \
  @aws-sdk/s3-request-presigner@^3.1000.0

# Remove package.json and package-lock.json
rm package.json package-lock.json

cd ../../..
cd layers-dist/image-processing && zip -r ../../layers/image-processing.zip . && cd ../..

echo "✓ Image processing layer built"

echo ""
echo "Lambda Layers built successfully!"
echo "  - layers/common-dependencies.zip"
echo "  - layers/image-processing.zip"
