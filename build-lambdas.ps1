$functionName = "AssetQL-ImageGenerator-dev"
$region = "ap-south-1"

$srcFile = "lambdas/image-generator/index.js"
$outDir  = "dist/image-generator"
$zipFile = "dist/image-generator.zip"

# Ensure source exists
if (-not (Test-Path $srcFile)) {
    Write-Host "Source not found: $srcFile"
    return
}

# Clean output directory
if (Test-Path $outDir) {
    Remove-Item $outDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "Bundling image-generator..."

esbuild $srcFile `
  --bundle `
  --platform=node `
  --target=node20 `
  --external:@aws-sdk/* `
  --external:sharp `
  --outfile="$outDir/index.js"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Bundle failed."
    return
}

# Recreate ZIP
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

Compress-Archive -Force `
  -Path "$outDir/*" `
  -DestinationPath $zipFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "ZIP creation failed."
    return
}

Write-Host "Deploying $functionName..."

aws lambda update-function-code `
  --function-name $functionName `
  --zip-file "fileb://$zipFile" `
  --region $region | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Update failed."
    return
}

aws lambda wait function-updated `
  --function-name $functionName `
  --region $region

if ($LASTEXITCODE -ne 0) {
    Write-Host "Wait failed."
    return
}

Write-Host ""
Write-Host "ImageGenerator deployed successfully."