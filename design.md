# AssetQL - Design Document

## 1. System Overview

AssetQL is a cloud-native, serverless-first creative asset production pipeline built on AWS and orchestrated via KIRO. The system transforms AI image generation from an individual creative tool into a production-grade asset factory capable of generating 100-500+ style-consistent images through automated workflow orchestration.

### Core Design Principles

**Serverless-First Architecture**: Leverage AWS Lambda, SQS, and managed services to eliminate infrastructure management and enable pay-per-use economics.

**Queue-Driven Processing**: Decouple batch submission from generation execution using Amazon SQS, enabling asynchronous processing, retry logic, and horizontal scaling.

**Style Consistency by Design**: Embed style enforcement at the generation layer using CLIP-based embeddings and deviation scoring to ensure brand consistency across batches.

**Asset Intelligence**: Treat generated images as managed assets with rich metadata, versioning, and lifecycle management rather than simple file outputs.

**Integration-Ready**: Design API-first architecture enabling seamless export to Unity, CMS platforms, and e-commerce systems.

### Technology Stack

**Frontend**: Next.js 14, React 18, TailwindCSS, Recharts (dashboard visualization)
**API Layer**: AWS API Gateway (REST), Lambda (Node.js 20)
**Compute**: AWS Lambda (primary), EC2 (optional for model hosting)
**Queue & Orchestration**: Amazon SQS, KIRO workflow engine
**AI/ML**: AWS Bedrock (LLM), SageMaker (image generation), CLIP (style embeddings)
**Storage**: Amazon S3 (assets), DynamoDB (metadata), CloudFront (CDN)
**Authentication**: AWS Cognito, JWT tokens
**Monitoring**: CloudWatch Logs, CloudWatch Metrics, X-Ray (tracing)

## 2. High-Level Architecture

### 2.1 Frontend Layer

**Next.js Dashboard Application**
- Server-side rendering for initial page load performance
- Client-side routing for SPA experience
- React components: UploadInterface, BatchMonitor, AssetLibrary, StyleProfileManager, ExportWizard

**Key UI Components**:

- **Upload Interface**: Drag-and-drop for style references and CSV files, real-time validation, preview before submission
- **Batch Configuration Panel**: Template editor with variable highlighting, style parameter controls, generation settings
- **Batch Monitor Dashboard**: Real-time progress bars, task-level status grid, error notifications, ETA calculations
- **Asset Library**: Grid/list view toggle, thumbnail lazy loading, infinite scroll, bulk selection, metadata sidebar
- **Style Profile Manager**: Saved profiles library, profile editor, style comparison view
- **Export Wizard**: Platform selection, format configuration, bulk download, CDN link generation

**State Management**: React Context API for global state (user, workspace), React Query for server state caching, Zustand for UI state

**API Communication**: Axios for HTTP requests, WebSocket for real-time batch updates, Retry logic with exponential backoff

### 2.2 API Layer

**AWS API Gateway (REST)**
- RESTful endpoints for all operations
- Request validation using JSON schemas
- CORS configuration for frontend domain
- Rate limiting: 100 requests/minute per user
- API key authentication for service-to-service calls

**Endpoint Structure**:
```
POST   /api/v1/batches              - Create new batch
GET    /api/v1/batches              - List user batches
GET    /api/v1/batches/{id}         - Get batch details
DELETE /api/v1/batches/{id}         - Delete batch

POST   /api/v1/styles               - Upload style reference
GET    /api/v1/styles               - List style profiles
GET    /api/v1/styles/{id}          - Get style profile
PUT    /api/v1/styles/{id}          - Update style profile

GET    /api/v1/assets               - List assets (with filters)
GET    /api/v1/assets/{id}          - Get asset details
DELETE /api/v1/assets/{id}          - Delete asset
POST   /api/v1/assets/search        - Search assets

POST   /api/v1/export               - Initiate export
GET    /api/v1/export/{id}/status   - Check export status
GET    /api/v1/export/{id}/download - Download export package
```

**Lambda Integration**: API Gateway triggers Lambda functions via proxy integration, Lambda response format: `{statusCode, body, headers}`

### 2.3 Compute Layer

**AWS Lambda Functions**

**Primary Functions**:

1. **BatchCreatorFunction**: Validates CSV, creates batch record, splits into tasks, pushes to SQS
2. **StyleEmbeddingFunction**: Processes style reference images, extracts CLIP embeddings, stores in DynamoDB
3. **ImageGeneratorFunction**: Consumes SQS messages, calls SageMaker endpoint, validates style consistency
4. **AssetTaggerFunction**: Auto-tags generated images using vision-language model, updates metadata
5. **ExportOrchestratorFunction**: Handles export requests, formats assets, generates CDN links
6. **WebSocketHandlerFunction**: Manages WebSocket connections for real-time updates

**Lambda Configuration**:
- Runtime: Node.js 20
- Memory: 512MB (API functions), 2GB (image processing functions)
- Timeout: 30s (API), 5min (generation), 15min (export)
- Concurrency: Reserved concurrency of 10 for ImageGeneratorFunction
- Environment variables: S3_BUCKET, DYNAMODB_TABLE, SQS_QUEUE_URL, SAGEMAKER_ENDPOINT

**EC2 (Optional for Heavy Model Hosting)**
- Instance type: g4dn.xlarge (GPU-enabled)
- Use case: Self-hosted Stable Diffusion if SageMaker costs prohibitive
- Auto-scaling group: 1-5 instances based on queue depth
- Spot instances for cost optimization

### 2.4 Queue & Workflow Layer

**Amazon SQS**

**Generation Queue** (`AssetQL-generation-queue`):
- Standard queue for task distribution
- Message format: `{batchId, taskId, prompt, styleProfileId, config}`
- Visibility timeout: 5 minutes (allows generation + retry)
- Dead-letter queue: After 3 failed attempts, move to DLQ
- Message retention: 14 days

**Priority Queue** (Optional for MVP):
- Separate queue for urgent batches
- KIRO routes high-priority batches here
- Dedicated Lambda consumers

**Dead-Letter Queue** (`AssetQL-generation-dlq`):
- Captures failed tasks after max retries
- Triggers alert Lambda for notification
- Manual review and reprocessing workflow

**KIRO Workflow Orchestration**

KIRO manages the end-to-end batch workflow:

**Workflow Steps**:
1. **Batch Initialization**: Validate inputs, create batch record, initialize progress tracking
2. **Task Distribution**: Split batch into individual tasks, push to SQS with rate limiting
3. **Generation Coordination**: Monitor queue depth, scale Lambda concurrency, handle backpressure
4. **Quality Control**: Collect style deviation scores, trigger regeneration for failed images
5. **Post-Processing**: Trigger tagging, categorization, thumbnail generation
6. **Completion**: Aggregate results, send notification, update batch status

**KIRO Integration Points**:
- Event-driven triggers from API Gateway
- SQS queue monitoring and consumer management
- Lambda invocation orchestration
- Error handling and retry logic
- Workflow state persistence in DynamoDB

### 2.5 AI Layer

**AWS Bedrock (LLM Orchestration)**

**Use Cases**:
- Prompt optimization: Enhance user prompts for better generation
- Auto-tagging: Generate descriptive tags from image analysis
- Metadata extraction: Parse CSV and generate structured metadata
- Natural language queries: Enable semantic search in asset library

**Model**: Claude 3 Sonnet or GPT-4 via Bedrock
**API**: Bedrock Runtime API for inference
**Cost Optimization**: Cache prompt templates, batch tagging requests

**AWS SageMaker (Image Generation)**

**Model Hosting**:
- Endpoint: Real-time inference endpoint hosting Stable Diffusion XL
- Instance type: ml.g5.xlarge (GPU-enabled)
- Auto-scaling: 1-3 instances based on invocation rate
- Model artifacts: Stored in S3, loaded on endpoint creation

**Inference Configuration**:
- Input: `{prompt, negative_prompt, style_embedding, width, height, steps, guidance_scale}`
- Output: Base64-encoded image
- Batch inference: Process multiple prompts in single call (if supported)
- Timeout: 60 seconds per inference

**Alternative**: Use Bedrock's Stable Diffusion if SageMaker setup too complex for hackathon

**Style Embedding Module**

**CLIP-Based Style Extraction**:

- Model: OpenAI CLIP ViT-L/14
- Process: Encode reference image → Extract 768-dim embedding → Store in DynamoDB
- Style parameters extracted: Color palette (dominant colors via k-means), Composition (rule of thirds, symmetry), Texture (frequency analysis), Lighting (brightness distribution)
- Embedding used to condition Stable Diffusion via ControlNet or textual inversion

**Style Deviation Scoring**:
- Compare generated image embedding with reference embedding
- Similarity metric: Cosine similarity (0-1 scale)
- Threshold: 0.85 (configurable)
- Additional checks: Color histogram distance, Edge detection similarity
- Score stored with asset metadata

### 2.6 Storage Layer

**Amazon S3 (Image Storage)**

**Bucket Structure**:
```
AssetQL-assets/
├── raw/                    # Original generated images
│   └── {batchId}/
│       └── {assetId}.png
├── thumbnails/             # Optimized thumbnails (256x256)
│   └── {assetId}_thumb.jpg
├── exports/                # Export packages
│   └── {exportId}.zip
└── style-references/       # User-uploaded style images
    └── {styleId}/
        └── reference.png
```

**Bucket Configuration**:
- Versioning: Enabled for asset recovery
- Lifecycle policy: Move to S3 Glacier after 90 days (optional)
- Encryption: SSE-S3 (server-side encryption)
- Access: Private by default, public read via CloudFront signed URLs

**S3 Event Notifications**:
- Trigger Lambda on new image upload for thumbnail generation
- Trigger tagging Lambda on raw image creation

**Amazon DynamoDB (Metadata)**

**Tables**:

**Batches Table** (`AssetQL-batches`):
```
PK: batchId (String)
Attributes:
  - userId (String)
  - name (String)
  - status (String): queued | processing | completed | failed
  - totalTasks (Number)
  - completedTasks (Number)
  - failedTasks (Number)
  - styleProfileId (String)
  - config (Map): dimensions, model, quality
  - createdAt (Number)
  - updatedAt (Number)
  - estimatedCompletion (Number)
GSI: userId-createdAt-index
```

**Assets Table** (`AssetQL-assets`):
```
PK: assetId (String)
Attributes:
  - batchId (String)
  - userId (String)
  - s3Key (String)
  - thumbnailS3Key (String)
  - prompt (String)
  - tags (List<String>)
  - category (String)
  - styleScore (Number)
  - dimensions (Map): width, height
  - fileSize (Number)
  - version (Number)
  - metadata (Map): custom fields from CSV
  - createdAt (Number)
GSI: batchId-createdAt-index
GSI: userId-category-index
```

**StyleProfiles Table** (`AssetQL-styles`):
```
PK: styleProfileId (String)
Attributes:
  - userId (String)
  - name (String)
  - referenceImages (List<String>): S3 keys
  - embedding (Binary): CLIP embedding
  - lockedParameters (Map): color, composition, texture
  - deviationThreshold (Number)
  - createdAt (Number)
GSI: userId-createdAt-index
```

**Tasks Table** (`AssetQL-tasks`):
```
PK: taskId (String)
SK: batchId (String)
Attributes:
  - status (String): queued | processing | completed | failed
  - prompt (String)
  - assetId (String): populated on completion
  - retryCount (Number)
  - errorMessage (String)
  - processingStartTime (Number)
  - processingEndTime (Number)
GSI: batchId-status-index
```

**DynamoDB Configuration**:
- Billing mode: On-demand (pay per request)
- Point-in-time recovery: Enabled
- Encryption: AWS-managed keys

**Amazon CloudFront (CDN)**

**Distribution Configuration**:
- Origin: S3 bucket (AssetQL-assets)
- Caching: Cache images for 7 days, thumbnails for 30 days
- Compression: Automatic gzip/brotli compression
- Geo-restriction: None (global access)
- SSL: CloudFront default certificate or custom domain

**Signed URLs**:
- Private assets served via signed URLs with expiration
- Public shareable links for exported assets
- URL format: `https://d123.cloudfront.net/{assetId}.png?Expires=...&Signature=...`

## 3. Data Flow

### End-to-End Workflow

**Step 1: User Uploads Style Reference + CSV**

- Frontend: User selects style reference images and CSV file
- API Call: `POST /api/v1/styles` with multipart form data
- StyleEmbeddingFunction: Uploads images to S3 (`style-references/`), extracts CLIP embeddings, stores in StyleProfiles table
- Response: Returns `styleProfileId`

**Step 2: User Configures Batch**
- Frontend: User sets template, dimensions, quality, locked parameters
- Validation: Frontend validates CSV format, checks required columns
- Preview: Shows first 3 generated prompts from template + CSV

**Step 3: User Submits Batch**
- API Call: `POST /api/v1/batches` with `{styleProfileId, csvData, config}`
- BatchCreatorFunction:
  - Parses CSV (100-500 rows)
  - Creates batch record in Batches table with status=queued
  - Generates taskId for each row
  - Creates task records in Tasks table
  - Pushes messages to SQS generation queue
  - Returns `batchId`
- Response: `{batchId, totalTasks, estimatedTime}`

**Step 4: KIRO Orchestrates Batch Logic**
- KIRO monitors SQS queue depth
- KIRO triggers Lambda consumers based on queue size
- KIRO manages concurrency limits (max 10 parallel)
- KIRO tracks batch progress in DynamoDB
- KIRO handles backpressure if queue grows too large

**Step 5: Lambda Consumes Queue**
- ImageGeneratorFunction triggered by SQS message
- Function receives: `{batchId, taskId, prompt, styleProfileId, config}`
- Updates task status to processing in Tasks table
- Retrieves style embedding from StyleProfiles table

**Step 6: SageMaker Generates Image**
- Lambda calls SageMaker endpoint: `invoke_endpoint(prompt, style_embedding, config)`
- SageMaker runs Stable Diffusion inference (5-15 seconds)
- Returns base64-encoded image
- Lambda decodes image

**Step 7: Style Validation**
- Lambda extracts CLIP embedding from generated image
- Calculates cosine similarity with reference embedding
- If similarity < threshold (0.85):
  - Increment retryCount
  - If retryCount < 3: Re-queue task to SQS
  - If retryCount >= 3: Mark task as failed, log to DLQ
- If similarity >= threshold: Proceed to storage

**Step 8: Image Storage**
- Lambda uploads image to S3: `raw/{batchId}/{assetId}.png`
- Generates assetId (UUID)
- Creates asset record in Assets table with metadata
- Updates task status to completed
- Increments batch completedTasks counter

**Step 9: S3 Event Triggers Post-Processing**
- S3 event notification triggers AssetTaggerFunction
- AssetTaggerFunction:
  - Downloads image from S3
  - Calls Bedrock (Claude) with image for tagging
  - Extracts tags: objects, colors, mood, style
  - Updates Assets table with tags and category
  - Generates thumbnail (256x256) and uploads to S3

**Step 10: Batch Completion**
- KIRO monitors batch progress
- When completedTasks + failedTasks == totalTasks:
  - Updates batch status to completed
  - Calculates average style score
  - Sends WebSocket notification to frontend
  - Triggers email notification (optional)

**Step 11: User Views Assets**
- Frontend polls `GET /api/v1/batches/{batchId}` for progress
- WebSocket receives real-time updates
- User navigates to asset library
- API Call: `GET /api/v1/assets?batchId={batchId}`
- Lambda queries Assets table, returns paginated results
- Frontend displays thumbnails via CloudFront URLs

**Step 12: User Exports Assets**
- User selects export platform (Unity, Shopify, etc.)
- API Call: `POST /api/v1/export` with `{assetIds, platform, formats}`
- ExportOrchestratorFunction:
  - Retrieves assets from S3
  - Resizes images for platform requirements
  - Packages as ZIP with metadata JSON
  - Uploads to S3 `exports/` folder
  - Generates CloudFront signed URL
- Response: `{exportId, downloadUrl, expiresAt}`

## 4. Module Design

### 4.1 Style Embedding Engine

**Purpose**: Extract and encode visual style from reference images for consistent batch generation.

**Architecture**:
```
Input: Reference Image(s)
  ↓
Image Preprocessing (resize, normalize)
  ↓
CLIP Encoder (ViT-L/14)
  ↓
768-dim Embedding Vector
  ↓
Style Parameter Extraction
  ↓
DynamoDB Storage
```

**Implementation Details**:

**Image Preprocessing**:
- Resize to 224x224 (CLIP input size)
- Normalize pixel values to [-1, 1]
- Convert to RGB if grayscale

**CLIP Encoding**:
- Use OpenAI CLIP model (hosted on Lambda or SageMaker)
- Extract image embedding from final layer
- Embedding represents semantic visual features

**Style Parameter Extraction**:

- **Color Palette**: K-means clustering (k=5) on RGB values → dominant colors
- **Composition**: Edge detection + Hough transform → detect symmetry, rule of thirds
- **Texture**: Gabor filters → frequency analysis for texture patterns
- **Lighting**: Histogram analysis → brightness distribution, contrast

**Storage Format**:
```json
{
  "styleProfileId": "uuid",
  "embedding": [0.123, -0.456, ...], // 768 floats
  "parameters": {
    "colorPalette": ["#FF5733", "#33FF57", ...],
    "composition": {"symmetry": 0.8, "ruleOfThirds": 0.6},
    "texture": {"frequency": "high", "pattern": "organic"},
    "lighting": {"brightness": 0.7, "contrast": 0.5}
  },
  "lockedParameters": ["colorPalette", "lighting"]
}
```

**Usage in Generation**:
- Embedding passed to Stable Diffusion via ControlNet or IP-Adapter
- Locked parameters enforced through prompt engineering
- Example: If color locked, append "with colors #FF5733, #33FF57" to prompt

### 4.2 Prompt Templating Engine

**Purpose**: Transform CSV data into generation-ready prompts using user-defined templates.

**Template Syntax**:
```
{variable_name} - Replaced with CSV column value
{variable_name|default} - Use default if column missing
{{expression}} - Conditional logic (optional for MVP)
```

**Example Template**:
```
A {style} illustration of {subject} {action} in {environment}, 
high quality, detailed, {mood} atmosphere
```

**CSV Row**:
```
subject,action,environment,mood,style
dragon,flying,mountain landscape,epic,fantasy
```

**Generated Prompt**:
```
A fantasy illustration of dragon flying in mountain landscape, 
high quality, detailed, epic atmosphere
```

**Implementation**:
- Parse template to identify variables
- Validate CSV has required columns
- Iterate through CSV rows
- Replace variables with values
- Append style modifiers from locked parameters
- Return array of prompts

**Advanced Features (Post-MVP)**:
- Conditional logic: `{{if category=="character"}}full body shot{{endif}}`
- Loops: `{{for item in accessories}}wearing {item}{{endfor}}`
- Functions: `{{capitalize(subject)}}`

### 4.3 Batch Job Manager

**Purpose**: Coordinate task distribution, progress tracking, and error handling for batch generation.

**State Machine**:
```
Batch States: queued → processing → completed | failed
Task States: queued → processing → completed | failed | retrying
```

**Job Manager Responsibilities**:

1. **Task Creation**:
   - Split batch into individual tasks
   - Assign unique taskId to each
   - Store in Tasks table with status=queued

2. **Queue Distribution**:
   - Push tasks to SQS in batches of 10 (avoid overwhelming queue)
   - Rate limiting: Max 100 messages/second
   - Include retry metadata in message attributes

3. **Progress Tracking**:
   - Subscribe to DynamoDB Streams on Tasks table
   - Aggregate task status changes
   - Update batch completedTasks, failedTasks counters
   - Calculate ETA based on average task duration

4. **Error Handling**:
   - Monitor DLQ for failed tasks
   - Classify errors: transient (retry), permanent (skip), style deviation (regenerate)
   - Trigger alerts for high failure rate (>10%)

5. **Completion Logic**:
   - Check if all tasks terminal (completed or failed)
   - Calculate batch statistics: success rate, average style score, total duration
   - Update batch status to completed
   - Trigger notification

**Concurrency Control**:
- KIRO manages Lambda concurrency based on queue depth
- Max concurrent: 10 (configurable)
- Backpressure: If queue depth > 1000, pause new batch submissions

### 4.4 Auto-Tagging Pipeline

**Purpose**: Automatically generate descriptive tags for assets using vision-language models.

**Pipeline Flow**:
```
Generated Image (S3)
  ↓
S3 Event Notification
  ↓
AssetTaggerFunction (Lambda)
  ↓
Download Image
  ↓
Call Bedrock (Claude 3 with vision)
  ↓
Parse Tags from Response
  ↓
Update DynamoDB Assets Table
```

**Tagging Prompt**:
```
Analyze this image and provide:
1. Objects present (comma-separated)
2. Scene type (indoor/outdoor/abstract/etc)
3. Dominant colors (3-5 colors)
4. Mood/atmosphere (1-2 words)
5. Art style (realistic/cartoon/abstract/etc)
6. Composition (portrait/landscape/square)

Format as JSON:
{
  "objects": ["dragon", "mountain", "sky"],
  "scene": "outdoor",
  "colors": ["blue", "gray", "orange"],
  "mood": "epic",
  "style": "fantasy illustration",
  "composition": "landscape"
}
```

**Tag Processing**:
- Parse JSON response
- Flatten into tag array: `["dragon", "mountain", "outdoor", "blue", "epic", "fantasy"]`
- Store in Assets table tags field
- Auto-categorize based on scene type

**Optimization**:
- Batch tagging: Process 10 images per Bedrock call (if supported)
- Cache common tags to reduce API calls
- Fallback to CLIP zero-shot classification if Bedrock unavailable

### 4.5 Export Formatting Module

**Purpose**: Transform assets into platform-specific formats and packages.

**Supported Platforms**:

**Unity Export**:

- Format: PNG or TGA (uncompressed)
- Folder structure: `Assets/AssetQL/{batchName}/Textures/`
- Metadata: JSON file with asset mappings
- Package: Unity-compatible .unitypackage (optional) or ZIP

**CMS Export (WordPress, Contentful)**:
- Format: JPEG (optimized for web)
- Metadata: Map tags to CMS taxonomy
- API upload: Direct POST to CMS media endpoint
- Bulk import: CSV with image URLs + metadata

**E-commerce Export (Shopify, WooCommerce)**:
- Format: JPEG, multiple sizes (thumbnail, medium, large)
- Naming: SKU-based if CSV includes SKU column
- Metadata: Alt text from tags, product category
- API upload: Use platform API for direct import

**Social Media Export**:
- Formats: Instagram (1080x1080, 1080x1350), Facebook (1200x630), Twitter (1200x675)
- Optimization: Compress to <1MB, sRGB color space
- Package: ZIP with platform-specific folders

**Export Process**:
1. User selects assets and platform
2. ExportOrchestratorFunction retrieves assets from S3
3. Resize/reformat using Sharp (Node.js image library)
4. Generate metadata file (JSON or CSV)
5. Create ZIP archive
6. Upload to S3 exports folder
7. Generate CloudFront signed URL (expires in 7 days)
8. Return download link to user

## 5. Scalability Design

### Horizontal Scaling Strategy

**Serverless Auto-Scaling**:
- Lambda: Automatic scaling up to account concurrency limit (1000 default)
- SQS: Unlimited queue depth, no scaling required
- DynamoDB: On-demand scaling handles traffic spikes
- S3: Unlimited storage, automatic request scaling

**Scaling Triggers**:
- Queue depth > 500: Increase Lambda concurrency to max
- Queue depth < 100: Reduce to minimum (cost optimization)
- API Gateway throttling: 10,000 requests/second (adjustable)

**Bottleneck Mitigation**:

**SageMaker Endpoint**:
- Bottleneck: Fixed instance count limits throughput
- Solution: Auto-scaling policy based on invocation rate
- Scale-out: Add instances when invocations > 100/min
- Scale-in: Remove instances when invocations < 20/min for 10 min

**Lambda Concurrency**:
- Bottleneck: Account-level concurrency limit (1000)
- Solution: Request limit increase from AWS
- Alternative: Use EC2 with auto-scaling group for generation

**DynamoDB Throughput**:
- Bottleneck: On-demand mode has soft limits
- Solution: Monitor consumed capacity, request increase if needed
- Alternative: Switch to provisioned capacity with auto-scaling

### Async Job Handling

**Queue-Based Decoupling**:
- Batch submission returns immediately (no waiting for generation)
- User receives batchId and polls for progress
- WebSocket provides real-time updates without polling overhead

**Long-Running Task Management**:
- Lambda timeout: 15 minutes max
- For longer batches: Chain Lambda invocations via Step Functions (post-MVP)
- Progress checkpointing: Store completed taskIds in DynamoDB

**Retry Strategy**:
- Exponential backoff: 1s, 2s, 4s delays between retries
- Max retries: 3 attempts per task
- Jitter: Add random delay to prevent thundering herd

### CloudFront Distribution

**Global CDN**:
- Edge locations: 400+ worldwide
- Cache hit ratio target: >90%
- Origin shield: Enabled for S3 origin protection

**Cache Strategy**:
- Thumbnails: Cache for 30 days (rarely change)
- Full images: Cache for 7 days
- Metadata API: No caching (always fresh)

**Invalidation**:
- On asset deletion: Invalidate CloudFront cache
- On version update: Use versioned URLs (no invalidation needed)

### Compute Throttling Strategies

**Cost Control**:
- Max concurrent Lambda: 10 (prevents runaway costs)
- SageMaker instance hours: Monitor and alert at $50/day
- Bedrock API calls: Rate limit to 1000/day for MVP

**User Quotas**:
- Free tier: 50 assets/month
- Paid tier: 500 assets/month
- Enterprise: Unlimited (custom pricing)

**Graceful Degradation**:
- If SageMaker unavailable: Queue tasks, notify user of delay
- If Bedrock unavailable: Skip auto-tagging, allow manual tagging
- If S3 slow: Use exponential backoff, retry uploads

## 6. Security Design

### IAM Roles and Policies

**Lambda Execution Roles**:

**ImageGeneratorFunction Role**:
```json
{
  "Effect": "Allow",
  "Action": [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes"
  ],
  "Resource": "arn:aws:sqs:*:*:AssetQL-generation-queue"
},
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject"
  ],
  "Resource": "arn:aws:s3:::AssetQL-assets/raw/*"
},
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:GetItem"
  ],
  "Resource": "arn:aws:dynamodb:*:*:table/AssetQL-*"
},
{
  "Effect": "Allow",
  "Action": "sagemaker:InvokeEndpoint",
  "Resource": "arn:aws:sagemaker:*:*:endpoint/AssetQL-sd-endpoint"
}
```

**Principle of Least Privilege**:
- Each Lambda has minimal permissions for its function
- No wildcard permissions in production
- Resource-level restrictions (specific S3 paths, DynamoDB tables)

### S3 Bucket Policies

**Private by Default**:
```json
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::AssetQL-assets/*",
  "Condition": {
    "StringNotEquals": {
      "aws:PrincipalArn": [
        "arn:aws:iam::*:role/AssetQLLambdaRole",
        "arn:aws:iam::*:role/CloudFrontOAI"
      ]
    }
  }
}
```

**CloudFront Origin Access Identity (OAI)**:
- S3 bucket only accessible via CloudFront
- Direct S3 URLs blocked
- Signed URLs for private assets

**Versioning and Lifecycle**:
- Versioning enabled: Recover from accidental deletions
- MFA delete: Require MFA for permanent deletion (production)
- Lifecycle policy: Archive to Glacier after 90 days

### API Gateway Security

**Authentication**:

- AWS Cognito User Pools for user management
- JWT tokens for API authentication
- Token expiration: 1 hour (access token), 30 days (refresh token)
- Authorization header: `Bearer <jwt_token>`

**API Key for Service-to-Service**:
- API keys for external integrations (CMS, e-commerce)
- Key rotation: Every 90 days
- Usage plans: Rate limiting per API key

**Rate Limiting**:
- Per user: 100 requests/minute
- Per IP: 1000 requests/minute
- Burst: 200 requests (short spike allowed)
- Throttling response: 429 Too Many Requests

**CORS Configuration**:
- Allowed origins: Frontend domain only (https://AssetQL.ai)
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed headers: Authorization, Content-Type
- Credentials: true (allow cookies)

### Encryption

**At Rest**:
- S3: SSE-S3 (AES-256 encryption)
- DynamoDB: AWS-managed encryption keys
- Secrets Manager: Encrypted API keys, credentials

**In Transit**:
- TLS 1.2+ for all API calls
- HTTPS-only CloudFront distribution
- Certificate: AWS Certificate Manager (ACM)

**Sensitive Data Handling**:
- No PII stored in logs
- User emails hashed in analytics
- Payment info: Never stored (use Stripe/payment gateway)

### Access Control

**Role-Based Access Control (RBAC)**:
- Roles: Admin, Creator, Viewer
- Permissions stored in Cognito user attributes
- Lambda authorizer validates role before API access

**Resource Ownership**:
- Users can only access their own batches/assets
- Workspace-level sharing: Assets shared within workspace
- Cross-workspace access: Denied by default

**Audit Logging**:
- CloudTrail: Log all AWS API calls
- Application logs: User actions (batch creation, export)
- Log retention: 90 days in CloudWatch, archive to S3

## 7. Deployment Strategy

### CI/CD Pipeline

**Source Control**:
- GitHub repository with main, develop, feature branches
- Branch protection: Require PR reviews, passing tests

**Build Pipeline**:
1. **Code Commit**: Developer pushes to feature branch
2. **GitHub Actions Trigger**: Run tests, linting
3. **Build**: Compile TypeScript, bundle frontend
4. **Test**: Unit tests, integration tests
5. **Package**: Create Lambda deployment packages, Docker images
6. **Deploy to Dev**: Automatic deployment to dev environment
7. **Manual Approval**: Review in dev, approve for production
8. **Deploy to Prod**: Deploy to production environment

**Tools**:
- GitHub Actions for CI/CD
- AWS SAM or Serverless Framework for Lambda deployment
- Docker for containerized components
- Terraform or CloudFormation for infrastructure

### Infrastructure as Code

**Terraform Configuration**:
```hcl
# Example structure
modules/
├── api-gateway/
├── lambda/
├── sqs/
├── dynamodb/
├── s3/
├── cloudfront/
└── sagemaker/

environments/
├── dev.tfvars
└── prod.tfvars
```

**Benefits**:
- Reproducible infrastructure
- Version-controlled infrastructure changes
- Easy environment replication (dev, staging, prod)
- Disaster recovery: Rebuild from code

**State Management**:
- Terraform state stored in S3
- State locking via DynamoDB
- Separate state files per environment

### Environment Separation

**Development Environment**:
- Smaller instance sizes (cost optimization)
- Relaxed rate limits for testing
- Debug logging enabled
- Test data and mock services

**Production Environment**:
- Production-grade instances
- Strict rate limiting
- Error-level logging only
- Real AI models and services
- Multi-AZ deployment for high availability

**Configuration Management**:
- Environment variables for config
- AWS Systems Manager Parameter Store for secrets
- Separate AWS accounts for dev/prod (optional)

### Deployment Process

**Lambda Deployment**:
1. Package code and dependencies as ZIP
2. Upload to S3 deployment bucket
3. Update Lambda function code from S3
4. Run smoke tests
5. Monitor CloudWatch metrics for errors

**Frontend Deployment**:
1. Build Next.js application
2. Upload static assets to S3
3. Invalidate CloudFront cache
4. Verify deployment via health check

**Database Migrations**:
- DynamoDB schema changes: Backward-compatible
- Add new attributes without breaking existing code
- Use DynamoDB Streams for data migration if needed

**Rollback Strategy**:
- Lambda versions: Keep previous 3 versions
- Instant rollback: Update alias to previous version
- Frontend: Revert CloudFront to previous S3 deployment
- Database: No rollback (forward-only migrations)

### Monitoring and Alerting

**CloudWatch Dashboards**:
- API Gateway: Request count, latency, error rate
- Lambda: Invocations, duration, errors, throttles
- SQS: Queue depth, message age, DLQ messages
- SageMaker: Invocations, latency, model errors
- DynamoDB: Read/write capacity, throttles

**Alarms**:
- Lambda error rate > 5%: Alert via SNS
- SQS DLQ messages > 10: Alert via SNS
- API Gateway 5xx errors > 1%: Alert via SNS
- SageMaker endpoint down: Alert via SNS
- Cost exceeds $100/day: Alert via SNS

**Logging**:
- Structured JSON logs
- Log levels: ERROR, WARN, INFO, DEBUG
- Correlation IDs: Track requests across services
- Log aggregation: CloudWatch Logs Insights

**Tracing**:
- AWS X-Ray for distributed tracing
- Trace batch workflow end-to-end
- Identify bottlenecks and latency issues

## 8. Future Enhancements

### Deep Collaboration Tools

**Real-Time Collaboration**:
- Multiple users editing batch configuration simultaneously
- Live cursor positions and selections
- Conflict resolution for concurrent edits

**Approval Workflows**:
- Multi-stage approval process (creator → reviewer → approver)
- Comments and feedback on individual assets
- Approval status tracking and notifications
- Version comparison during review

**Team Communication**:
- In-app chat per batch or workspace
- @mentions and notifications
- Activity feed showing team actions

### Advanced Analytics

**Usage Analytics**:
- Dashboard showing: batches created, assets generated, storage used, cost breakdown
- Trends over time: generation volume, success rate, style consistency
- User behavior: Most used templates, popular export formats

**Quality Analytics**:
- Style consistency trends across batches
- Failure analysis: Common error patterns
- Model performance: Generation time, quality scores
- A/B testing: Compare different models or parameters

**Business Intelligence**:
- ROI calculator: Time saved vs. cost
- Benchmarking: Compare against industry averages
- Predictive analytics: Forecast usage and costs

### Style Marketplace

**Community Style Library**:
- Users share style profiles publicly
- Browse and download popular styles
- Rating and review system
- Trending styles dashboard

**Premium Styles**:
- Professional artists sell curated style profiles
- Licensing and payment integration
- Style bundles and collections
- Exclusive styles for subscribers

**Style Customization**:
- Fine-tune downloaded styles
- Blend multiple styles
- Style evolution: Gradually shift between styles

### Plugin Ecosystem

**Third-Party Integrations**:
- Plugin API for external developers
- Marketplace for plugins
- OAuth for secure plugin access
- Plugin categories: Export formats, AI models, post-processing

**Custom AI Models**:
- Bring your own model (BYOM)
- Fine-tuned Stable Diffusion models
- LoRA and textual inversion support
- Model versioning and A/B testing

**Post-Processing Plugins**:
- Upscaling (Real-ESRGAN, GFPGAN)
- Background removal
- Color grading and filters
- Watermarking and branding

### Multi-Modal Content

**Video Generation**:
- Text-to-video using Runway, Pika, or similar
- Style-consistent video clips
- Batch video generation from CSV
- Video editing and trimming

**Banner and Ad Variations**:
- Multi-size banner generation (display ads)
- A/B testing variations
- Dynamic text overlay
- Platform-specific optimization (Google Ads, Facebook Ads)

**3D Asset Generation**:
- Text-to-3D using Shap-E or similar
- Style-consistent 3D models
- Export to Unity, Unreal, Blender
- Texture generation for existing 3D models

**Audio Integration**:
- Background music generation
- Voiceover synthesis
- Sound effects matching visual style
- Multi-modal asset packages (image + audio)

### Enterprise Features

**Advanced Security**:
- SSO integration (SAML, OKTA)
- Audit logs with compliance reporting
- Data residency options (region-specific storage)
- Private cloud deployment (VPC)

**Custom Branding**:
- White-label solution for agencies
- Custom domain and branding
- Client-specific workspaces
- Branded export packages

**SLA and Support**:
- 99.9% uptime SLA
- Priority support channel
- Dedicated account manager
- Custom feature development

**Advanced Workflow**:
- Multi-step workflows (generate → review → refine → export)
- Conditional logic in workflows
- Integration with project management tools (Jira, Asana)
- Automated scheduling and recurring batches

---

## Document Metadata

- **Version**: 1.0
- **Last Updated**: 2026-02-15
- **Status**: Draft
- **Owner**: Technical Architecture Team
- **Reviewers**: Engineering Lead, DevOps Lead, Security Lead
