#!/bin/bash

# AssetQL Lambda Build Script
# Bundles Lambda functions with esbuild and validates common issues

set -e

echo "╔════════════════════════════════════════╗"
echo "║   Building Lambda Functions            ║"
echo "╚════════════════════════════════════════╝"
echo ""

# 1. Validate crypto imports before building
echo "🔍 Validating Lambda functions..."
validation_failed=0

for dir in lambdas/*/ ; do
    dirname=$(basename "$dir")
    index_file="lambdas/$dirname/index.js"
    
    if [ -f "$index_file" ]; then
        # Check if file uses crypto.randomUUID but doesn't import crypto
        if grep -q "crypto\.randomUUID" "$index_file" && ! grep -q "require('crypto')" "$index_file"; then
            echo "❌ $dirname: Uses crypto.randomUUID() but missing: const crypto = require('crypto');"
            validation_failed=1
        fi
    fi
done

if [ $validation_failed -eq 1 ]; then
    echo ""
    echo "❌ Validation failed! Fix the issues above before building."
    exit 1
fi

echo "✓ All validations passed"
echo ""

# 2. Clean old builds
echo "🧹 Cleaning old builds..."
rm -rf dist && mkdir dist

# 3. Loop through every folder in /lambdas
echo "🔨 Building Lambda functions..."
echo ""

build_count=0
for dir in lambdas/*/ ; do
    dirname=$(basename "$dir")
    
    echo "  Building $dirname..."

    # Use esbuild to bundle the code
    # --bundle: Includes all local dependencies (like ../../shared)
    # --external: Excludes packages provided by Lambda Layers
    npx esbuild "lambdas/$dirname/index.js" \
      --bundle \
      --platform=node \
      --target=node20 \
      --external:@aws-sdk/* \
      --external:uuid \
      --external:sharp \
      --external:archiver \
      --outfile="dist/$dirname/index.js" \
      --log-level=error

    # Zip it up (no node_modules needed - provided by layers)
    cd "dist/$dirname" && zip -q -r "../../lambdas/$dirname.zip" . && cd ../..
    
    build_count=$((build_count + 1))
done

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Build Complete! ✅                   ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Built $build_count Lambda functions"
echo "Output: lambdas/*.zip"
echo ""
echo "Note: Dependencies are provided by Lambda Layers"
echo "      (AWS SDK, uuid, sharp, archiver)"
echo ""
