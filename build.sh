#!/bin/bash

# 1. Clean old builds
rm -rf dist && mkdir dist

# 2. Loop through every folder in /lambdas
for dir in lambdas/*/ ; do
    # Get the folder name (e.g., "style-embedding")
    dirname=$(basename "$dir")
    
    echo "Building $dirname..."

    # 3. Use esbuild to "bundle" the code into one file
    # External packages are provided by Lambda Layers
    npx esbuild "lambdas/$dirname/index.js" \
      --bundle \
      --platform=node \
      --target=node20 \
      --external:@aws-sdk/* \
      --external:uuid \
      --external:sharp \
      --external:archiver \
      --outfile="dist/$dirname/index.js"

    # 4. Zip it up (no node_modules needed - provided by layers)
    cd "dist/$dirname" && zip -r "../../lambdas/$dirname.zip" . && cd ../..
done

echo ""
echo "Lambda functions built successfully!"
echo "Note: Dependencies are provided by Lambda Layers"
