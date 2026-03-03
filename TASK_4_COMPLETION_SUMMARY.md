# Task 4: Fix 413 Content Too Large Error - COMPLETED

## Problem
Style upload was failing with 413 Content Too Large error because images were being sent as base64 in the request body, hitting API Gateway's 10MB payload limit.

## Solution
Implemented presigned S3 upload architecture to bypass API Gateway payload limits.

## Changes Made

### 1. Lambda Functions (Already Completed in Previous Session)
- ✅ Created `lambdas/presign-upload/index.js` - Generates presigned S3 URLs
- ✅ Modified `lambdas/style-embedding/index.js` - Now accepts S3 key instead of base64 image

### 2. Infrastructure Changes (Completed in This Session)

#### A. Added presign-upload Lambda to Terraform
**File**: `infra/modules/lambdas-core/main.tf`
- Added `aws_lambda_function.presign_upload` resource
- Configuration:
  - Memory: 256MB
  - Timeout: 10 seconds
  - Environment: `S3_BUCKET` only
  - Uses common-dependencies layer

#### B. Fixed style-embedding Environment Variables
**File**: `infra/modules/lambdas-core/main.tf`
- ❌ REMOVED: `DYNAMODB_STYLES_TABLE` (incorrect name)
- ✅ ADDED: `STYLES_TABLE_NAME` (correct name matching code)
- ❌ REMOVED: Unused variables (`FEEDBACK_TABLE_NAME`, `SESSIONS_TABLE_NAME`, `SQS_QUEUE_URL`)
- Final environment variables for style-embedding:
  - `S3_BUCKET`
  - `STYLES_TABLE_NAME`

#### C. Added presign-upload Output
**File**: `infra/modules/lambdas-core/outputs.tf`
- Added `presign_upload_arn` output for use in API Gateway module

#### D. Wired presign-upload to API Gateway
**File**: `infra/modules/api-gateway/variables.tf`
- Added `presign_upload_arn` variable

**File**: `infra/modules/api-gateway/main.tf`
- Added `/presign` resource under `/api/v1`
- Added `POST /api/v1/presign` method with Cognito authorization
- Added Lambda integration for presign_post
- Added CORS OPTIONS method for `/presign`
- Added Lambda permission for API Gateway to invoke presign_upload
- Updated deployment triggers to include presign resources
- Updated depends_on to include presign_post integration

#### E. Connected Modules
**File**: `infra/main.tf`
- Added `presign_upload_arn = module.lambdas_core.presign_upload_arn` to api_gateway module

## New API Endpoint

### POST /api/v1/presign
**Purpose**: Generate presigned S3 upload URL for direct client-side uploads

**Request**:
```json
{
  "fileName": "reference.png",
  "fileType": "image/png",
  "folder": "style-references"
}
```

**Response**:
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "s3Key": "style-references/uuid/reference.png",
  "expiresIn": 300,
  "bucket": "AssetQL-assets"
}
```

**Allowed File Types**: image/jpeg, image/jpg, image/png, image/webp

## Updated Style Upload Flow

### Old Flow (Broken - 413 Error)
1. Frontend sends image as base64 in POST /api/v1/styles
2. ❌ Hits 10MB API Gateway limit

### New Flow (Fixed)
1. Frontend calls POST /api/v1/presign with file metadata
2. Backend returns presigned S3 URL (valid for 5 minutes)
3. Frontend uploads image directly to S3 using presigned URL
4. Frontend calls POST /api/v1/styles with `{ s3Key, name }`
5. Backend fetches image from S3 and analyzes with Nova Lite

## Next Steps

### 1. Deploy Infrastructure
```bash
cd infra
terraform plan
terraform apply
```

### 2. Package and Deploy Lambda Functions
```bash
# Package presign-upload
cd lambdas/presign-upload
zip -r ../presign-upload.zip .
cd ../..

# Package style-embedding (if not already done)
cd lambdas/style-embedding
zip -r ../style-embedding.zip .
cd ../..

# Deploy via Terraform
cd infra
terraform apply
```

### 3. Update Frontend
The frontend needs to implement the two-step upload process:
1. Call `/api/v1/presign` to get upload URL
2. Upload file directly to S3 using presigned URL
3. Call `/api/v1/styles` with the returned `s3Key`

## Verification Checklist

- [x] presign-upload Lambda added to Terraform
- [x] presign-upload output added
- [x] style-embedding environment variables fixed
- [x] /presign endpoint added to API Gateway
- [x] CORS configured for /presign
- [x] Lambda permissions configured
- [x] Deployment triggers updated
- [x] Module connections updated
- [x] No Terraform syntax errors

## Files Modified

1. `infra/modules/lambdas-core/main.tf` - Added presign_upload Lambda, fixed style_embedding env vars
2. `infra/modules/lambdas-core/outputs.tf` - Added presign_upload_arn output
3. `infra/modules/api-gateway/variables.tf` - Added presign_upload_arn variable
4. `infra/modules/api-gateway/main.tf` - Added /presign endpoint with POST method and CORS
5. `infra/main.tf` - Connected presign_upload_arn to api_gateway module

## Critical Fixes Applied

✅ **Environment Variable Mismatch Fixed**: Changed `DYNAMODB_STYLES_TABLE` → `STYLES_TABLE_NAME` in style-embedding Lambda
✅ **Unused Variables Removed**: Cleaned up style-embedding environment to only include required variables
✅ **Presigned Upload Architecture**: Implemented to bypass API Gateway 10MB limit
✅ **Complete API Gateway Integration**: Added endpoint, CORS, permissions, and deployment triggers

## Status: READY FOR DEPLOYMENT
All infrastructure code is complete and validated. No syntax errors detected.
