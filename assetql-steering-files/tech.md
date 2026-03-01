# AssetQL Technical Stack

## Architecture

Serverless-first AWS architecture with queue-driven processing, event-driven workflows, and Bedrock Agent orchestration.

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
- **Amazon Nova Micro** (text-only, ultra-low-cost)
  - Prompt refinement
  - PromptEngineerAgent foundation model
- **Amazon Nova Lite** (vision + text, 50x cheaper than Claude)
  - Style analysis
  - Auto-tagging
  - Style consistency scoring
  - QualityGatekeeperAgent foundation model
- **Stable Image Core** (50% cheaper than SDXL, faster generation)
  - Image generation
  - 1:1 aspect ratio support
- **Amazon Bedrock Agents**
  - PromptEngineerAgent (iterative refinement)
  - QualityGatekeeperAgent (quality control)

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
- **Process**: Save reference to S3, analyze style, store profile in DynamoDB

### 2. batch-creator
- **Trigger**: API Gateway (POST /api/v1/batches)
- **Purpose**: Create batch jobs from CSV input
- **Process**: Apply prompt template, append style modifiers, create batch/task records, push to SQS

### 3. image-generator
- **Trigger**: SQS queue messages
- **Purpose**: Generate images with style consistency validation
- **AI Models**: Stable Image Core + Nova Lite for scoring
- **Process**: Generate image, score style, retry if needed, save to S3, update records

### 4. asset-tagger
- **Trigger**: S3 event notification (new image upload)
- **Purpose**: Auto-tag images and generate thumbnails
- **AI Model**: Amazon Nova Lite
- **Dependencies**: sharp (image processing)
- **Process**: Analyze image, generate 256x256 thumbnail, update asset record

### 5. action-get-feedback-ledger
- **Trigger**: Bedrock Agent Action Group invocation
- **Purpose**: Retrieve feedback history for a session
- **Process**: Query AssetQL-feedback table, sort by iterationNumber, return structured data

### 6. action-refine-prompt
- **Trigger**: Bedrock Agent Action Group invocation
- **Purpose**: Refine prompts using AI while respecting locked elements
- **AI Model**: Amazon Nova Lite
- **Process**: Call Nova Lite with structured refinement prompt, parse JSON response

### 7. session-manager
- **Trigger**: API Gateway (POST/PUT/GET /api/v1/sessions)
- **Purpose**: Manage session lifecycle with strict phase transitions
- **Operations**:
  - POST: Create new session
  - PUT: Update phase (validates legal transitions)
  - GET: Retrieve session
- **Phase Flow**: UPLOAD → SINGLE_ITERATION → BATCH_REVIEW → STYLE_LOCKED → AUTOMATION → COMPLETE

## Bedrock Agents

### PromptEngineerAgent
- **Foundation Model**: amazon.nova-micro-v1:0
- **Action Groups**: GetFeedbackLedger, RefinePrompt
- **Purpose**: Iterative prompt refinement based on user feedback
- **Instruction**: "You are a prompt refinement specialist. Use the GetFeedbackLedger action to retrieve session history, then use RefinePrompt to improve the master prompt based on user feedback while preserving locked style elements."

### QualityGatekeeperAgent
- **Foundation Model**: amazon.nova-lite-v1:0
- **Action Groups**: TriggerGeneration
- **Purpose**: Quality control and batch state management
- **Instruction**: "You are a quality control agent. Evaluate image generation results, manage batch state transitions, and determine when style is sufficiently locked for automation."

## Code Conventions

### Shared Module Pattern
All Lambda functions import from `shared/index.js`:
```javascript
const { dynamo, s3, sqs, bedrock, response,
        GetCommand, PutCommand, UpdateCommand, QueryCommand,
        PutObjectCommand, GetObjectCommand,
        SendMessageBatchCommand, InvokeModelCommand } = require('../../shared');
```

### Bedrock Configuration
- **Region**: ap-south-1 (configured in shared/index.js)
- **Models Used**:
  - `amazon.nova-micro-v1:0` (text-only)
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
  aspect_ratio: "1:1",
  output_format: "png"
}
```

### Bedrock Agent Action Group Event Format
```javascript
{
  actionGroup: "action-group-name",
  function: "function-name",
  parameters: [
    { name: "paramName", value: "paramValue" }
  ]
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

**Bedrock Agent Action Group Handler:**
```javascript
exports.handler = async (event) => {
  const { actionGroup, function: functionName, parameters } = event;
  // Extract parameters, process, return Bedrock Agent response format
  return {
    messageVersion: '1.0',
    response: {
      actionGroup,
      function: functionName,
      functionResponse: {
        responseBody: { 'TEXT': { body: JSON.stringify(result) } }
      }
    }
  };
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
- **AssetQL-feedback**: Feedback history per session/iteration
- **AssetQL-sessions**: Session lifecycle management

### Lambda Environment Variables
- `S3_BUCKET`: Asset storage bucket name
- `SQS_QUEUE_URL`: Generation queue URL
- `SESSIONS_TABLE_NAME`: Sessions table name
- `FEEDBACK_TABLE_NAME`: Feedback table name
- `DYNAMODB_STYLES_TABLE`: Styles table name

## Session Lifecycle

### Phase Transitions (Strict)
```
UPLOAD → SINGLE_ITERATION → BATCH_REVIEW → STYLE_LOCKED → AUTOMATION → COMPLETE
```

Each phase can only transition to the next phase in sequence. Illegal transitions return 409 Conflict.

## Cost Optimization Strategy

### AI Model Selection
- **Amazon Nova Micro**: Ultra-low-cost for text-only tasks
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
- Bedrock Agent IAM roles with scoped permissions
- CORS headers: `Access-Control-Allow-Origin: *`

## Performance Targets

- API response time: <200ms (non-generation endpoints)
- Image generation: 5-10 seconds per image (Stable Image Core)
- Style analysis: <5 seconds (Nova Lite)
- Batch of 100 images: <20 minutes
- Thumbnail generation: <2 seconds (sharp)
- Auto-tagging: <3 seconds (Nova Lite)
- Session operations: <100ms (DynamoDB)
