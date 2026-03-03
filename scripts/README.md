# AssetQL Build & Deploy Scripts

Quick reference for building and deploying AssetQL backend infrastructure.

## Prerequisites

- AWS CLI configured with credentials
- Node.js 20+ and pnpm installed
- Terraform installed (for infrastructure changes)

## Scripts Overview

### `./scripts/build.sh`
Builds all Lambda functions with validation.

**What it does:**
- Validates crypto imports (prevents runtime errors)
- Bundles each Lambda with esbuild (includes `shared` module)
- Creates deployment-ready ZIP files in `lambdas/*.zip`

**Usage:**
```bash
./scripts/build.sh
```

**Output:**
- `lambdas/style-embedding.zip`
- `lambdas/presign-upload.zip`
- `lambdas/websocket-handler.zip`
- ... (all Lambda functions)

---

### `./scripts/deploy-lambda.sh <lambda-name>`
Quick deploy for a single Lambda during development.

**What it does:**
- Validates the Lambda code
- Builds and packages the Lambda
- Deploys directly to AWS
- Waits for deployment to complete

**Usage:**
```bash
# Deploy style-embedding Lambda
./scripts/deploy-lambda.sh style-embedding

# Deploy websocket-handler Lambda
./scripts/deploy-lambda.sh websocket-handler
```

**Available Lambdas:**
- `action-get-feedback-ledger`
- `action-refine-prompt`
- `asset-tagger`
- `automation-trigger`
- `batch-creator`
- `export-handler`
- `export-orchestrator`
- `feedback-handler`
- `image-generator`
- `presign-upload`
- `session-manager`
- `style-embedding`
- `websocket-handler`

---

### `./scripts/build-layers.sh`
Builds Lambda Layers with shared dependencies.

**What it does:**
- Creates `common-dependencies` layer (AWS SDK, uuid)
- Creates `image-processing` layer (sharp, archiver)
- Outputs to `layers/*.zip`

**Usage:**
```bash
./scripts/build-layers.sh
```

**When to run:**
- After updating dependencies in the script
- Before deploying infrastructure with Terraform

---

### `./scripts/deploy.sh`
Full production deployment (infrastructure + Lambdas).

**What it does:**
- Builds all Lambda functions
- Builds Lambda layers
- Deploys infrastructure with Terraform
- Shows deployment outputs

**Usage:**
```bash
./scripts/deploy.sh
```

**Warning:** This deploys to production AWS!

---

### `./scripts/dev.sh`
Development mode (local frontend + AWS backend).

**What it does:**
- Starts Next.js frontend on `localhost:3000`
- Monitors AWS Lambda logs in real-time
- Auto-reloads on code changes

**Usage:**
```bash
./scripts/dev.sh
```

**Press Ctrl+C to stop**

---

### `./scripts/watch-logs.sh`
Monitor Lambda logs in real-time.

**Usage:**
```bash
./scripts/watch-logs.sh
```

---

## Common Workflows

### Fix a bug in a Lambda
```bash
# 1. Edit the Lambda code
vim lambdas/style-embedding/index.js

# 2. Quick deploy
./scripts/deploy-lambda.sh style-embedding

# 3. Test and monitor logs
aws logs tail /aws/lambda/AssetQL-StyleEmbedding-dev --follow
```

### Deploy all changes
```bash
# Build everything
./scripts/build.sh

# Deploy with Terraform
cd infra && terraform apply
```

### Update Lambda dependencies
```bash
# 1. Edit build-layers.sh to add/update packages
vim scripts/build-layers.sh

# 2. Rebuild layers
./scripts/build-layers.sh

# 3. Deploy infrastructure
cd infra && terraform apply
```

---

## Build Validations

The build script automatically validates:

### ✅ Crypto Import Check
Ensures all Lambdas using `crypto.randomUUID()` have:
```javascript
const crypto = require('crypto');
```

**Why:** Node.js 20 requires explicit import of built-in modules.

### ✅ Shared Module Bundling
Uses esbuild `--bundle` to include the `../../shared` module.

**Why:** Lambda needs the shared utilities (dynamo, s3, response helpers).

### ✅ External Dependencies
Excludes packages provided by Lambda Layers:
- `@aws-sdk/*` (AWS SDK v3)
- `uuid`
- `sharp`
- `archiver`

**Why:** Reduces deployment package size and leverages Lambda Layers.

---

## Troubleshooting

### "Cannot find module '../../shared'"
**Cause:** Lambda not bundled with esbuild.

**Fix:** Use `./scripts/build.sh` or `./scripts/deploy-lambda.sh` (not manual zip).

### "crypto is not defined"
**Cause:** Missing `const crypto = require('crypto');`

**Fix:** Add import at top of Lambda file. Build script will catch this.

### "Function not found" during deploy
**Cause:** Function name mismatch.

**Fix:** Check function name in AWS Console. Format is `AssetQL-<PascalCase>-dev`.

---

## Environment Variables

Set these before running scripts:

```bash
export AWS_REGION=ap-south-1
export ENVIRONMENT=dev
```

Or use `config.private.sh`:
```bash
source config.private.sh
```

---

## Notes

- **Build time:** ~5 seconds for all Lambdas
- **Deploy time:** ~10 seconds per Lambda
- **Full deployment:** ~5 minutes (Terraform)
- **Dependencies:** Provided by Lambda Layers (not in ZIP)
- **Bundle size:** ~2-10KB per Lambda (after bundling)
