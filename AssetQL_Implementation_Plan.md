# AssetQL — Implementation Plan
> Prototype-ready, AWS-native, Amazon Bedrock for both LLM and Image Generation

---

## Guiding Principle for Prototype

**Key Swap from Design Doc**: Replace SageMaker (Stable Diffusion) with **Amazon Bedrock Image Generation** (Stability AI SDXL or Amazon Titan Image Generator via Bedrock). All other architecture stays intact. CLIP-based style embedding is simplified to **Bedrock Claude 3 vision** for style analysis during prototyping.

---

## Phase 0 — Project Scaffolding & AWS Setup
*Estimated time: 2–3 hours*

### 0.1 AWS Account & IAM Setup
- Create an AWS IAM user/role with access to: Lambda, API Gateway, S3, SQS, DynamoDB, Cognito, CloudFront, Bedrock, CloudWatch, X-Ray
- Enable Amazon Bedrock model access in your region (us-east-1 or us-west-2):
  - **Claude 3 Sonnet** — for LLM (prompt optimization, auto-tagging, metadata extraction, style scoring)
  - **Stability AI SDXL 1.0** or **Amazon Titan Image Generator v2** — for image generation
- Create an S3 bucket for Terraform state: `assetql-terraform-state`
- Create a DynamoDB table for Terraform state locking: `assetql-tf-lock`

### 0.2 Repository & Tooling Setup
- Monorepo structure:
  ```
  assetql/
  ├── frontend/          # Next.js 14 app
  ├── lambdas/           # Lambda functions (Node.js 20)
  │   ├── batch-creator/
  │   ├── style-embedding/
  │   ├── image-generator/
  │   ├── asset-tagger/
  │   ├── export-orchestrator/
  │   └── websocket-handler/
  ├── infra/             # Terraform IaC
  └── shared/            # Shared types, utils, constants
  ```
- Install tooling: Node.js 20, AWS CLI v2, Terraform, pnpm/npm

### 0.3 Terraform Base Infrastructure Module
- Configure AWS provider and backend (S3 + DynamoDB state locking)
- Create base modules: S3 buckets, DynamoDB tables, SQS queues, Cognito user pool, CloudFront distribution skeleton

---

## Phase 1 — Storage & Database Layer
*Estimated time: 2–3 hours*

### 1.1 Amazon S3 Buckets
- **`assetql-assets-{env}`** — main asset bucket with folder structure:
  - `raw/{batchId}/{assetId}.png`
  - `thumbnails/{assetId}_thumb.jpg`
  - `exports/{exportId}.zip`
  - `style-references/{styleId}/reference.png`
- Bucket config: versioning enabled, SSE-S3 encryption, CORS for frontend domain, block public access (serve only via CloudFront)
- S3 event notification → trigger `AssetTaggerFunction` on object creation under `raw/` prefix

### 1.2 DynamoDB Tables
Create all 4 tables with proper keys, GSIs, on-demand billing, and point-in-time recovery:

- **`AssetQL-batches`** — PK: `batchId`, GSI: `userId-createdAt-index`
- **`AssetQL-assets`** — PK: `assetId`, GSI: `batchId-createdAt-index` + `userId-category-index`
- **`AssetQL-styles`** — PK: `styleProfileId`, GSI: `userId-createdAt-index`
- **`AssetQL-tasks`** — PK: `taskId`, SK: `batchId`, GSI: `batchId-status-index`
- **`AssetQL-connections`** — PK: `connectionId` (for WebSocket session tracking)

Enable DynamoDB Streams on the `AssetQL-tasks` table for batch progress aggregation.

### 1.3 Amazon SQS Queues
- **`AssetQL-generation-queue`** — standard queue, visibility timeout: 5 minutes, message retention: 14 days
- **`AssetQL-generation-dlq`** — dead-letter queue, wired as redrive target with max receive count: 3

### 1.4 Amazon CloudFront Distribution
- Origin: `assetql-assets` S3 bucket with Origin Access Control (OAC)
- Cache policies: thumbnails (30 days), raw images (7 days), exports (7 days)
- Signed URLs for private asset access with configurable expiry
- URL format: `https://{dist_id}.cloudfront.net/{assetId}.png`

---

## Phase 2 — Authentication Layer
*Estimated time: 1–2 hours*

### 2.1 AWS Cognito User Pool
- User pool: email-based sign-up/sign-in, email verification required
- Password policy: min 8 chars, requires number + symbol
- App client: public client (no secret), for SPA use
- Token expiry: access token 1 hour, refresh token 30 days

### 2.2 API Gateway JWT Authorizer
- Attach Cognito JWT authorizer to all API Gateway routes
- Extract `userId` from JWT claims (`sub` field) in Lambda via `event.requestContext.authorizer.claims.sub`
- Pass `userId` to all DynamoDB operations for data isolation

---

## Phase 3 — Lambda Functions
*Estimated time: 6–8 hours — this is the core backend*

All Lambdas: Node.js 20 runtime, structured JSON logging, X-Ray tracing enabled, environment variables from AWS Systems Manager Parameter Store.

### 3.1 `BatchCreatorFunction`
**Trigger**: POST `/api/v1/batches`

Responsibilities:
1. Parse and validate incoming CSV (100–500 rows), verify required columns exist (`prompt`, `variant_id` minimum)
2. Apply prompt template — replace `{variable}` placeholders with CSV column values for each row
3. Append style modifier strings extracted from the style profile (inject color palette, art style, mood into each prompt)
4. Create batch record in `AssetQL-batches` table with `status: queued`
5. Generate a UUID taskId for each CSV row
6. Batch-insert all task records into `AssetQL-tasks` table (`status: queued`)
7. Push SQS messages in batches of 10 using `SendMessageBatch`, message body: `{batchId, taskId, prompt, styleProfileId, config}`
8. Return `{batchId, totalTasks, estimatedTime}` to caller

Memory: 512MB | Timeout: 30s

### 3.2 `StyleEmbeddingFunction`
**Trigger**: POST `/api/v1/styles`

Responsibilities:
1. Accept multipart form with 1–5 images (JPEG/PNG/WebP, max 10MB each)
2. Validate image format and dimensions
3. Upload reference images to S3 `style-references/{styleId}/`
4. Call **Bedrock Claude 3 Sonnet (vision)** with each reference image and a structured prompt requesting JSON output:
   - `colorPalette` (top 5 hex colors), `composition`, `texture`, `lighting`, `artStyle`, `mood`
5. Merge descriptors across multiple reference images if provided
6. Store style profile in `AssetQL-styles` table including the descriptors JSON and locked parameter flags
7. Return `styleProfileId`

> **Prototype Note**: This replaces native CLIP ViT-L/14. Bedrock Claude 3 vision provides semantically rich style descriptions adequate for prompt augmentation and basic deviation scoring. Post-prototype, replace with a Python Lambda layer or SageMaker endpoint running CLIP for vector embeddings and cosine similarity.

Memory: 1GB | Timeout: 30s

### 3.3 `ImageGeneratorFunction`
**Trigger**: SQS event (`AssetQL-generation-queue`), batch size: 1

Responsibilities:
1. Read message: `{batchId, taskId, prompt, styleProfileId, config, retryCount}`
2. Update task status → `processing` in DynamoDB
3. Fetch style profile from `AssetQL-styles`, extract style descriptors
4. Build augmented prompt: original prompt + appended style modifiers + negative prompt
5. **Call Amazon Bedrock Image Generation** using `@aws-sdk/client-bedrock-runtime` `InvokeModelCommand`:
   - Model ID: `stability.stable-diffusion-xl-v1` or `amazon.titan-image-generator-v2:0`
   - Payload: `{text_prompts, negative_prompts, width, height, steps, cfg_scale}`
   - Parse base64-encoded image from response
6. **Style Deviation Check**: Send the generated image + original style descriptors to **Bedrock Claude 3 Sonnet (vision)**, ask for a similarity score (0–100). Parse score from response.
7. If score < 85 AND retryCount < 3: Re-enqueue message with `retryCount + 1`, delete current message from SQS
8. If score < 85 AND retryCount >= 3: Mark task `failed`, log to DLQ
9. If score >= 85: upload PNG to S3 `raw/{batchId}/{assetId}.png`, create asset record in `AssetQL-assets`, update task status → `completed`, atomically increment `completedTasks` on the batch record

Memory: 2GB | Timeout: 5 minutes | Reserved Concurrency: 10

### 3.4 `AssetTaggerFunction`
**Trigger**: S3 event on object creation under `raw/` prefix

Responsibilities:
1. Download the newly created image from S3
2. Call **Bedrock Claude 3 Sonnet (vision)** with tagging prompt:
   > "Analyze this image and return only JSON: {objects[], scene, colors[], mood, style, composition}"
3. Parse JSON response, flatten into a tag array
4. Generate a 256×256 thumbnail using the **Sharp** npm library
5. Upload thumbnail to S3 `thumbnails/{assetId}_thumb.jpg`
6. Update `AssetQL-assets` DynamoDB record: add `tags[]`, `category`, `thumbnailS3Key`

Memory: 1GB | Timeout: 2 minutes

### 3.5 `ExportOrchestratorFunction`
**Trigger**: POST `/api/v1/export`

Responsibilities:
1. Accept `{assetIds[], platform, formats[]}` from API
2. For each asset: download from S3, resize using Sharp for platform-specific dimensions:
   - Unity: PNG unchanged or TGA
   - Shopify/WooCommerce: JPEG in 3 sizes (thumb/medium/large)
   - Social: Instagram 1080×1080, Facebook 1200×630, Twitter 1200×675
3. Generate `metadata.json` with asset-to-filename mappings, tags, and prompts
4. Bundle all files into a ZIP archive using the `archiver` npm package
5. Upload ZIP to S3 `exports/{exportId}.zip`
6. Generate CloudFront signed URL with 7-day expiry
7. Return `{exportId, downloadUrl, expiresAt}`

Memory: 2GB | Timeout: 15 minutes

### 3.6 `WebSocketHandlerFunction`
**Trigger**: API Gateway WebSocket routes (`$connect`, `$disconnect`, `$default`)

Responsibilities:
- `$connect`: Store `{connectionId, userId, connectedAt}` in `AssetQL-connections` DynamoDB table
- `$disconnect`: Delete connection record
- **Broadcasting**: Invoked by `BatchProgressFunction` — query all connectionIds for a userId, send JSON payload `{type: "batchUpdate", batchId, completedTasks, totalTasks, status}` via `ApiGatewayManagementApiClient`

Memory: 256MB | Timeout: 30s

### 3.7 `BatchProgressFunction`
**Trigger**: DynamoDB Streams on `AssetQL-tasks` table

Responsibilities:
1. Process stream records filtering for `status` attribute changes
2. For each completed/failed task event: query `AssetQL-batches` for current progress
3. When `completedTasks + failedTasks == totalTasks`:
   - Update batch status → `completed`
   - Calculate average style score across all assets in the batch
   - Invoke `WebSocketHandlerFunction` (or directly use API Gateway Management API) to push completion notification to the connected frontend client

Memory: 256MB | Timeout: 30s

---

## Phase 4 — API Gateway Layer
*Estimated time: 2–3 hours*

### 4.1 REST API (`AssetQL-API`)
- Cognito JWT authorizer on all routes (except `/health`)
- CORS: allow frontend origin, `Content-Type` and `Authorization` headers
- Rate limit: 100 requests/minute per user (usage plan)
- Request validation via JSON Schema on POST/PUT bodies

Route → Lambda mappings:
```
POST   /api/v1/batches              → BatchCreatorFunction
GET    /api/v1/batches              → shared CrudFunction (list batches by userId)
GET    /api/v1/batches/{id}         → shared CrudFunction (get batch + task summary)
DELETE /api/v1/batches/{id}         → shared CrudFunction (soft delete)

POST   /api/v1/styles               → StyleEmbeddingFunction
GET    /api/v1/styles               → shared CrudFunction
GET    /api/v1/styles/{id}          → shared CrudFunction
PUT    /api/v1/styles/{id}          → shared CrudFunction

GET    /api/v1/assets               → shared CrudFunction (filter by batchId, category, tags)
GET    /api/v1/assets/{id}          → shared CrudFunction
DELETE /api/v1/assets/{id}          → shared CrudFunction
POST   /api/v1/assets/search        → SearchAssetsFunction

POST   /api/v1/export               → ExportOrchestratorFunction
GET    /api/v1/export/{id}/status   → shared CrudFunction
GET    /api/v1/export/{id}/download → shared CrudFunction (return signed URL)
```

> Tip: Consolidate the simple GET/DELETE operations into a single `CrudFunction` Lambda with path-based routing logic to minimize function sprawl.

### 4.2 WebSocket API (`AssetQL-WS`)
- Routes: `$connect`, `$disconnect`, `$default` → `WebSocketHandlerFunction`
- Stage variables for managing dev/prod endpoints

---

## Phase 5 — Frontend (Next.js 14)
*Estimated time: 8–12 hours*

### 5.1 Project Setup
- `create-next-app` with TypeScript, TailwindCSS, App Router
- Key dependencies: `@tanstack/react-query`, `zustand`, `axios`, `react-dropzone`, `papaparse`, `recharts`
- Auth: `amazon-cognito-identity-js` or AWS Amplify Auth
- Env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`

### 5.2 Auth Pages
- `/login` — email + password form, Cognito `signIn`, store JWT in memory (not localStorage)
- `/register` — sign-up with email verification step
- Auth context provider: expose `user`, `token`, `signOut`, auto-attach `Authorization: Bearer` to all Axios calls

### 5.3 Dashboard Shell
- Sidebar navigation: Dashboard overview, Batches, Asset Library, Style Profiles, Export History
- Top header: workspace name, user avatar, logout
- Global toast notification system (for batch completion, errors)

### 5.4 Style Profile Manager (`/styles`)
- Dropzone for uploading 1–5 reference images with preview thumbnails
- Form fields: profile name, deviation threshold (slider, default 85%), locked parameter checkboxes (colorPalette, composition, texture, lighting)
- Profile library: card grid with reference image preview, creation date, usage count, edit/delete actions
- API: POST `/api/v1/styles` (multipart), GET/PUT/DELETE `/api/v1/styles`

### 5.5 Batch Creation Wizard (`/batches/new`)
**Step 1 — Upload CSV**: Dropzone for CSV, `papaparse` for client-side parse, display first 5 rows with detected columns, inline error highlighting for missing required columns

**Step 2 — Prompt Template**: Text editor with `{variable}` syntax highlighting, variable badge dropdown mapped to CSV column names, live preview panel rendering the first 3 prompts using real CSV row data

**Step 3 — Select Style Profile**: Card selector for saved style profiles, option to create a new one inline

**Step 4 — Generation Settings**: Dimension selector, quality/steps slider, concurrency limit (default 10), batch name and description

**Step 5 — Review & Submit**: Summary card (total tasks, estimated time, estimated cost), POST `/api/v1/batches` on confirm, redirect to batch monitor on success

### 5.6 Batch Monitor Dashboard (`/batches/{id}`)
- Progress bar: `completedTasks / totalTasks` with percentage
- Status chip summary: queued / processing / completed / failed counts
- ETA display: estimated minutes remaining
- Task grid: paginated table of taskId, status badge, prompt snippet, style score, duration
- Failed tasks expandable panel with error message + "Retry" button
- WebSocket connection on mount: listen for `batchUpdate` events, update React Query cache in real-time
- Polling fallback: `GET /api/v1/batches/{id}` every 5 seconds if WS is unavailable

### 5.7 Asset Library (`/assets`)
- Filter bar: batch dropdown, category chips, tag multi-select, style score range slider
- Grid/list view toggle with thumbnail lazy loading via `next/image` (CloudFront URLs)
- Infinite scroll using TanStack Query's `useInfiniteQuery`
- Asset detail drawer: full image preview, metadata fields, tag list, prompt used, style score badge, CloudFront URL copy button
- Bulk selection with checkbox, bulk download or export actions

### 5.8 Export Wizard (`/export`)
- Asset selector: pre-populated from Asset Library bulk selection
- Platform dropdown: Unity, Shopify, WordPress, Instagram, Facebook, Twitter/X, Raw ZIP
- Format options auto-fill based on platform selection
- POST `/api/v1/export` → poll `GET /api/v1/export/{id}/status` every 3 seconds → display download button with signed CloudFront URL on completion

### 5.9 State Management
- **React Context**: current Cognito user session, token refresh
- **TanStack Query**: all API data with automatic caching, background refetch, and optimistic updates
- **Zustand**: UI state — selected assets in bulk, active batch filters, sidebar collapsed state

---

## Phase 6 — KIRO Workflow Integration
*Estimated time: 2–4 hours*

### 6.1 KIRO Workflow: `BatchProcessingWorkflow`

Define these workflow steps in KIRO triggered via a webhook from the BatchCreatorFunction upon batch creation:

**`InitializeBatch`** — Validates batch record exists in DynamoDB, transitions batch status to `processing`, records workflow start time.

**`DistributeTasks`** — Confirms all tasks have been pushed to SQS. Manages rate limiting (max 100 SQS messages/sec). Adjusts Lambda reserved concurrency based on batch size.

**`MonitorProgress`** — Polls `AssetQL-batches` every 30 seconds. Checks `completedTasks + failedTasks` vs `totalTasks`. Manages Lambda concurrency: scale up if queue depth > 500, scale down if queue depth < 50.

**`HandleFailures`** — Monitors DLQ message count. If DLQ > 10 messages, publishes alert to SNS, optionally pauses further task distribution.

**`CompleteBatch`** — Triggered when all tasks are terminal (completedTasks + failedTasks == totalTasks). Finalizes batch record: average style score, total duration, asset count. Invokes WebSocket broadcast for frontend notification.

**`PostProcessing`** — Verifies all assets in the batch have been tagged. Re-triggers `AssetTaggerFunction` for any untagged assets.

### 6.2 KIRO ↔ AWS Integration Points
- KIRO triggered by API Gateway webhook event on batch creation
- KIRO reads DynamoDB batch/task tables for state
- KIRO publishes to SNS for alerts and notifications
- KIRO invokes Lambda directly for orchestration actions where supported

---

## Phase 7 — Monitoring & Observability
*Estimated time: 1–2 hours*

### 7.1 CloudWatch Dashboards
Create dashboards tracking: Lambda invocations/duration/errors/throttles per function, SQS queue depth + oldest message age + DLQ count, DynamoDB read/write capacity + throttles, Bedrock invocation count + latency (custom metrics emitted from Lambda), API Gateway request count + 4xx/5xx rates + p99 latency.

### 7.2 CloudWatch Alarms → SNS Topic
- Lambda error rate > 5% on any function
- SQS DLQ message count > 10
- API Gateway 5xx error rate > 1%
- Daily cost estimate exceeds prototype budget threshold ($50/day)

### 7.3 AWS X-Ray Distributed Tracing
- Enable active tracing on all Lambda functions and API Gateway stages
- Create X-Ray sub-segments for each Bedrock call, DynamoDB operation, and S3 upload using the X-Ray SDK
- This provides end-to-end batch pipeline visibility for debugging latency and failures

### 7.4 Structured Log Format
All Lambdas emit JSON logs:
```json
{
  "level": "INFO",
  "requestId": "...",
  "userId": "...",
  "batchId": "...",
  "taskId": "...",
  "message": "Image generated successfully",
  "styleScore": 91,
  "durationMs": 4320
}
```
Use CloudWatch Logs Insights to aggregate across functions and trace full batch execution.

---

## Phase 8 — Infrastructure as Code (Terraform)
*Estimated time: 3–4 hours*

### 8.1 Module Structure
```
infra/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── storage/       # S3 buckets, CloudFront, OAC
│   ├── database/      # All DynamoDB tables with GSIs
│   ├── queues/        # SQS + DLQ with redrive policy
│   ├── auth/          # Cognito user pool + app client
│   ├── lambdas/       # All Lambda functions + IAM roles
│   ├── api_gateway/   # REST API + WebSocket API
│   └── monitoring/    # CloudWatch dashboards, alarms, SNS
```

### 8.2 IAM Roles (Least Privilege per Function)
- **BatchCreatorFunction**: `sqs:SendMessageBatch`, `dynamodb:PutItem/UpdateItem`, `s3:GetObject` (for CSV validation)
- **StyleEmbeddingFunction**: `bedrock:InvokeModel`, `s3:PutObject`, `dynamodb:PutItem`
- **ImageGeneratorFunction**: `bedrock:InvokeModel`, `sqs:ReceiveMessage/DeleteMessage/SendMessage`, `s3:PutObject`, `dynamodb:GetItem/PutItem/UpdateItem`
- **AssetTaggerFunction**: `bedrock:InvokeModel`, `s3:GetObject/PutObject`, `dynamodb:UpdateItem`
- **ExportOrchestratorFunction**: `s3:GetObject/PutObject`, `dynamodb:GetItem/Query`, `cloudfront:CreateInvalidation`
- **WebSocketHandlerFunction**: `dynamodb:PutItem/DeleteItem/Query`, `execute-api:ManageConnections`

### 8.3 Environments
- `dev` Terraform workspace: smaller Lambda memory, relaxed rate limits, debug logging enabled
- `prod` Terraform workspace: production memory allocations, strict rate limits, error-level logging only

---

## Phase 9 — End-to-End Testing & Demo Setup
*Estimated time: 2–3 hours*

### 9.1 Integration Test Scenarios
- Full happy path: upload style image → create 10-row CSV batch → poll progress → verify assets in S3 and DynamoDB → export as ZIP
- Retry logic: verify a task that fails style check is re-queued and eventually succeeds or lands in DLQ after 3 attempts
- WebSocket: connect frontend to WS API, submit batch, verify real-time progress events appear in the batch monitor

### 9.2 Demo Data Preparation
- 3 sample CSV files: 10 rows (quick demo), 50 rows (mid demo), 100 rows (full scale demo)
- 3 style reference images: fantasy art, product photography, flat cartoon
- Pre-generate a 20-asset batch to have the Asset Library pre-populated at demo start

### 9.3 Pre-Demo Smoke Test Checklist
- [ ] Cognito sign-up, email verification, and sign-in all work end to end
- [ ] Style profile upload triggers Bedrock vision and stores descriptors in DynamoDB
- [ ] CSV upload parses correctly and template preview renders in UI
- [ ] Batch submission creates correct SQS message count
- [ ] `ImageGeneratorFunction` calls Bedrock SDXL and successfully saves PNG to S3
- [ ] S3 event triggers `AssetTaggerFunction` and tags appear in asset record
- [ ] Batch monitor shows real-time WebSocket progress updates
- [ ] Asset library renders thumbnails via CloudFront signed URLs
- [ ] Export produces a downloadable ZIP with correct folder structure

---

## Bedrock Model Reference for Prototype

| Use Case | Bedrock Model | Notes |
|---|---|---|
| Image Generation | `stability.stable-diffusion-xl-v1` | Primary image gen; alt: `amazon.titan-image-generator-v2:0` |
| Style Extraction | `anthropic.claude-3-sonnet-20240229-v1:0` | Vision mode, returns style descriptor JSON |
| Prompt Optimization | `anthropic.claude-3-sonnet-20240229-v1:0` | Text mode, enhances user prompts before generation |
| Auto-Tagging | `anthropic.claude-3-sonnet-20240229-v1:0` | Vision mode, analyzes generated image |
| Style Deviation Score | `anthropic.claude-3-sonnet-20240229-v1:0` | Vision mode, compares generated image vs style descriptors |

---

## Recommended Build Order (Hackathon Sequence)

| Hour Range | Task |
|---|---|
| 1–2 | AWS setup, Terraform base infra: S3 + DynamoDB + SQS + Cognito + CloudFront |
| 3–4 | `BatchCreatorFunction` + `StyleEmbeddingFunction` (Bedrock Claude vision) |
| 5–7 | `ImageGeneratorFunction` (Bedrock SDXL) — critical path, validate end-to-end |
| 8–9 | `AssetTaggerFunction` + S3 event trigger wiring |
| 10–11 | API Gateway REST + WebSocket + `WebSocketHandlerFunction` |
| 12–14 | Frontend: Auth, Batch Creation Wizard, Batch Monitor |
| 15–17 | Frontend: Asset Library + Style Profile Manager |
| 18–19 | `ExportOrchestratorFunction` + Export Wizard UI |
| 20–21 | KIRO workflow wiring and integration |
| 22–24 | CloudWatch monitoring, end-to-end testing, demo data prep |

---

## Post-Prototype Upgrades (Moving Beyond Bedrock)

When you are ready to graduate from the prototype, swap these components in:

- Replace Bedrock image generation with a **SageMaker real-time endpoint** hosting Stable Diffusion XL with ControlNet or IP-Adapter for true vector-based style conditioning
- Replace Bedrock Claude vision style scoring with a native **CLIP ViT-L/14** model running in a Python Lambda layer or SageMaker endpoint for cosine similarity scoring against 768-dimensional embeddings
- Add **AWS Step Functions** for long-running batch orchestration (replacing basic KIRO polling for very large 500+ item batches)
- Add **EC2 g4dn.xlarge spot instances** as overflow compute if SageMaker throughput becomes insufficient at scale

---

*Document Version: 1.0 | Project: AssetQL | Status: Prototype Implementation Plan*
