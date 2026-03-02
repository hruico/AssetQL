$functionName = "AssetQL-SessionManager-dev"
$region = "ap-south-1"

$srcFile = "lambdas/session-manager/index.js"
$outDir  = "dist/session-manager"
$zipFile = "dist/session-manager.zip"

# Ensure esbuild exists
if (-not (Get-Command esbuild -ErrorAction SilentlyContinue)) {
    Write-Host "esbuild not found. Install with: npm install -g esbuild"
    return
}

# Ensure source exists
if (-not (Test-Path $srcFile)) {
    Write-Host "Source file not found: $srcFile"
    return
}

# Clean output directory
if (Test-Path $outDir) {
    Remove-Item $outDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "Bundling..."

esbuild $srcFile `
  --bundle `
  --platform=node `
  --target=node20 `
  --external:@aws-sdk/* `
  --external:sharp `
  --external:archiver `
  --outfile="$outDir/index.js"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Bundle failed."
    return
}

# Re-zip
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

Write-Host "Deploying Lambda..."

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
Write-Host "Redeployed successfully. Test now."