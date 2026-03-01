# AssetQL Technical Stack

## Architecture

Serverless-first AWS architecture with queue-driven processing and event-driven workflows.

## Core Technologies

### Frontend
- Next.js 14 (React 18)
- TailwindCSS for styling
- Recharts for dashboard visualization
- React Query for server state caching
- Zustand for UI state management

### Backend & Infrastructure
- AWS Lambda (Node.js 20 runtime)
- Amazon API Gateway (REST)
- Amazon SQS (queue-based task distribution)
- Amazon S3 (asset storage with event notifications)
- Amazon DynamoDB (metadata storage)
- Amazon CloudFront (CDN)
- AWS Cognito (authentication)
- Terraform for infrastructure as code

### AI/ML Stack
- **Amazon Nova Lite** (vision + text, 50x cheaper than Claude)
  - Style analysis
  - Auto-tagging
  - Style consistency scoring
- **Stable Image Core** (50% cheaper than SDXL, faster generation)
  - Image generation
  - 1:1 aspect ratio support
- **Amazon Bedrock** (unified AI service)
  - Region: ap-south-1 (Mumbai)

### Package Management
- pnpm (v10.30.3) - specified in package.json packageManager field

## Dependencies

```json
{
  "@aws-sdk/client-bedrock-runtime": "^3.1000.0",
  "@aws-sdk/client-dynamodb": "^3.1000.0",
  "@aws-sdk/client-s3": "^3.1000.0",
  "@aws-sdk/client-sqs": "^3.1000.0",
  "@aws-sdk/lib-dynamodb": "^3.1000.0",
  "sharp": "^0.34.5",
  "uuid": "^13.0.0"
}
```

## Lambda Functions (Implemented)

### 1. style-embedding
- **Trigger**: API Gateway (POST /api/v1/styles)
- **Purpose**: Analyze style references and create style profiles
- **AI Model**: Amazon Nova Lite (`amazon.nova-lite-v1:0`)
- **Process**:
  1. Save reference image to S3 (`style-references/{styleProfileId}/`)
  2. Analyze style with Nova Lite (color palette, composition, texture, lighting, art style, mood)
  3. Store style profile in DynamoDB (`AssetQL-styles`)

### 2. batch-creator
- **Trigger**: API Gateway (POST /api/v1/batches)
- **Purpose**: Create batch jobs from CSV input
- **Process**:
  1. Fetch style profile from DynamoDB
  2. Apply prompt template with CSV variables
  3. Append style modifiers (art style, mood, colors)
  4. Create batch record in DynamoDB (`AssetQL-batches`)
  5. Create task records (`AssetQL-tasks`)
  6. Push tasks to SQS queue in batches of 10

### 3. image-generator
- **Trigger**: SQS queue messages
- **Purpose**: Generate images with style consistency validation
- **AI Models**: 
  - Stable Image Core (`stability.stable-image-core-v1:0`) for generation
  - Amazon Nova Lite for style scoring
- **Process**:
  1. Fetch style profile from DynamoDB
  2. Generate image with Stable Image Core
  3. Score style consistency with Nova Lite
  4. Retry if score < threshold (max 3 attempts with exponential backoff)
  5. Save image to S3 (`raw/{batchId}/{assetId}.png`)
  6. Create asset record in DynamoDB (`AssetQL-assets`)
  7. Update task and batch counters

### 4. asset-tagger
- **Trigger**: S3 event notification (new image upload)
- **Purpose**: Auto-tag images and generate thumbnails
- **AI Model**: Amazon Nova Lite
- **Dependencies**: sharp (image processing)
- **Process**:
  1. Download image from S3
  2. Analyze with Nova Lite (objects, scene, colors, mood, style, composition, category)
  3. Generate 256x256 thumbnail with sharp
  4. Upload thumbnail to S3 (`thumbnails/{assetId}_thumb.jpg`)
  5. Update asset record with tags and thumbnail key

## Code Conventions

### Shared Module Pattern
All Lambda functions import from `shared/index.js`:
```javascript
const { dynamo, s3, sqs, bedrock, response,
        GetCommand, PutCommand, UpdateCommand,
        PutObjectCommand, GetObjectCommand,
        SendMessageBatchCommand, InvokeModelCommand } = require('../../shared');
```

### Bedrock Configuration
- **Region**: ap-south-1 (configured in shared/index.js)
- **Models Used**:
  - `amazon.nova-lite-v1:0` (vision + text)
  - `stability.stable-image-core-v1:0` (image generation)

### Nova Lite Request Format
```javascript
{
  messages: [{
    role: 'user',
    content: [
      { image: { format: 'png', source: { bytes: buffer } } },
      { text: 'prompt text' }
    ]
  }],
  inferenceConfig: { maxTokens: 1024, temperature: 0.3 }
}
```

### Stable Image Core Request Format
```javascript
{
  prompt: "detailed prompt",
  negative_prompt: "elements to avoid",
  aspect_ratio: "1:1",  // or "16:9", "9:16", "4:3", "3:4"
  output_format: "png"
}
```

### Standard Lambda Patterns

**API Gateway Handler:**
```javascript
exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const body = JSON.parse(event.body);
  // Business logic
  return response(statusCode, { data });
};
```

**SQS Handler:**
```javascript
exports.handler = async (event) => {
  const record = event.Records[0];
  const { batchId, taskId, prompt } = JSON.parse(record.body);
  // Process message
};
```

**S3 Event Handler:**
```javascript
exports.handler = async (event) => {
  const s3Record = event.Records[0].s3;
  const s3Key = decodeURIComponent(s3Record.object.key);
  // Process S3 object
};
```

## AWS Configuration

### Primary Region
- ap-south-1 (Mumbai) - Bedrock, Terraform backend

### S3 Bucket Structure
```
AssetQL-assets/
├── raw/{batchId}/{assetId}.png
├── thumbnails/{assetId}_thumb.jpg
├── exports/{exportId}.zip
└── style-references/{styleProfileId}/reference.{ext}
```

### DynamoDB Tables
- **AssetQL-batches**: Batch metadata, progress tracking
- **AssetQL-assets**: Asset metadata, tags, categories, thumbnails
- **AssetQL-styles**: Style profiles with descriptors
- **AssetQL-tasks**: Individual task status and retry counts

### Lambda Environment Variables
- `S3_BUCKET`: Asset storage bucket name
- `SQS_QUEUE_URL`: Generation queue URL

## Cost Optimization Strategy

### AI Model Selection
- **Amazon Nova Lite**: 50x cheaper than Claude 3 for vision tasks
- **Stable Image Core**: 50% cheaper than SDXL, faster generation
- **Batch Processing**: Process 10 tasks per SQS batch to reduce overhead

### Retry Logic
- Exponential backoff: 1s, 2s, 4s delays
- Max 3 retries per task
- Style score threshold: 85 (configurable)

## Common Commands

### Package Management
```bash
pnpm install              # Install dependencies
pnpm add <package>        # Add new dependency
```

### Infrastructure
```bash
cd infra
terraform init            # Initialize Terraform
terraform plan            # Preview changes
terraform apply           # Apply infrastructure changes
terraform destroy         # Tear down infrastructure
```

## Security Patterns

- IAM roles with least privilege access
- S3 encryption at rest (SSE-S3)
- S3 event notifications for automated workflows
- TLS 1.2+ for all API communication
- JWT authentication via Cognito
- Private S3 buckets (CloudFront OAI only)
- CORS headers: `Access-Control-Allow-Origin: *`

## Performance Targets

- API response time: <200ms (non-generation endpoints)
- Image generation: 5-10 seconds per image (Stable Image Core)
- Style analysis: <5 seconds (Nova Lite)
- Batch of 100 images: <20 minutes
- Thumbnail generation: <2 seconds (sharp)
- Auto-tagging: <3 seconds (Nova Lite)
