#!/bin/bash

# 1. Clean old builds
rm -rf dist && mkdir dist

# 2. Loop through every folder in /lambdas
for dir in lambdas/*/ ; do
    # Get the folder name (e.g., "style-embedding")
    dirname=$(basename "$dir")
    
    echo "Building $dirname..."

    # 3. Use esbuild to "bundle" the code into one file
    # This grabs ONLY the code used by that specific index.js
    npx esbuild "lambdas/$dirname/index.js" \
      --bundle \
      --platform=node \
      --target=node20 \
      --external:sharp \
      --outfile="dist/$dirname/index.js"

    # 4. Copy the Linux version of sharp into the dist folder
    # (Lambda needs the physical files since we marked it 'external')
    cp -r node_modules/sharp "dist/$dirname/node_modules/"

    # 5. Zip it up
    cd "dist/$dirname" && zip -r "../../lambdas/$dirname.zip" . && cd ../..
done