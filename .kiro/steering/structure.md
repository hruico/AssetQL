# AssetQL Project Structure

## Directory Organization

```
AssetQL/
├── .kiro/                          # Kiro configuration
│   ├── specs/                      # Feature specifications
│   │   └── assetql-platform/       # Platform feature specs
│   └── steering/                   # Project steering rules
│
├── infra/                          # Infrastructure as Code (Terraform)
│   ├── main.tf                     # Root Terraform configuration
│   ├── variables.tf                # Input variables
│   ├── .terraform.lock.hcl         # Dependency lock file
│   └── modules/                    # Terraform modules
│       ├── auth/                   # Cognito authentication
│       ├── database/               # DynamoDB tables
│       ├── queues/                 # SQS queues
│       └── storage/                # S3 buckets & CloudFront
│
├── lambdas/                        # AWS Lambda functions
│   ├── style-embedding/            # Style analysis Lambda
│   │   └── index.js
│   ├── batch-creator/              # Batch creation Lambda
│   │   └── index.js
│   ├── image-generator/            # Image generation Lambda
│   │   └── index.js
│   └── asset-tagger/               # Auto-tagging Lambda
│       └── index.js
│
├── shared/                         # Shared utilities
│   └── index.js                    # AWS SDK clients & helpers
│
├── package.json                    # Node.js dependencies
├── pnpm-lock.yaml                  # pnpm lock file
├── .npmrc                          # npm configuration
├── .gitignore                      # Git ignore rules
│
├── README.md                       # Project documentation
├── requirements.md                 # Detailed requirements (outdated)
├── design.md                       # System design document (outdated)
├── architecture-diagram.md         # Architecture visualization
├── AssetQL_Implementation_Plan.md  # Implementation roadmap
├── ProcessFlowDiagram.md           # Process flow documentation
└── IdeaBoard.png                   # Visual concept board
```

## Implemented Lambda Functions

### 1. style-embedding
- **Trigger**: API Gateway (POST /api/v1/styles)
- **Purpose**: Analyze style references and create style profiles
- **Key Features**:
  - Saves reference images to S3
  - Uses Amazon Nova Lite for style analysis
  - Extracts: color palette, composition, texture, lighting, art style, mood, negative prompt
  - Stores style profile in DynamoDB

### 2. batch-creator
- **Trigger**: API Gateway (POST /api/v1/batches)
- **Purpose**: Create batch jobs from CSV input
- **Key Features**:
  - Applies prompt template with CSV variable substitution
  - Appends style modifiers from style profile
  - Creates batch and task records in DynamoDB
  - Pushes tasks to SQS in batches of 10

### 3. image-generator
- **Trigger**: SQS queue messages
- **Purpose**: Generate images with style consistency validation
- **Key Features**:
  - Uses Stable Image Core for generation
  - Uses Amazon Nova Lite for style scoring
  - Implements retry logic with exponential backoff (max 3 attempts)
  - Saves images to S3 and creates asset records
  - Updates batch progress counters

### 4. asset-tagger
- **Trigger**: S3 event notification (new image upload)
- **Purpose**: Auto-tag images and generate thumbnails
- **Key Features**:
  - Uses Amazon Nova Lite for image analysis
  - Generates 256x256 thumbnails with sharp
  - Extracts: objects, scene, colors, mood, style, composition, category
  - Updates asset records with tags and thumbnail keys

## Module Organization

### Infrastructure Modules (`infra/modules/`)

Each module is self-contained with its own `main.tf` and optional `variables.tf`:

- **auth/**: Cognito user pools, identity pools, JWT configuration
- **database/**: DynamoDB tables (batches, assets, styles, tasks)
- **queues/**: SQS queues (generation queue, dead-letter queue)
- **storage/**: S3 buckets (assets, exports, references), CloudFront distribution, S3 event notifications

Modules are imported in `infra/main.tf`:
```hcl
module "storage" {
  source = "./modules/storage"
  project_name = var.project_name
  environment  = var.environment
}
```

### Shared Code (`shared/`)

Central location for reusable code:
- AWS SDK v3 clients (DynamoDB, S3, SQS, Bedrock)
- Bedrock configured for ap-south-1 region
- Standard response helper for API Gateway
- Exported command classes for easy imports

All Lambda functions import from this module to ensure consistency.

## File Naming Conventions

### Infrastructure
- Terraform files: lowercase with hyphens (e.g., `main.tf`, `variables.tf`)
- Module directories: lowercase singular nouns (e.g., `auth`, `storage`)

### Lambda Functions
- Directory names: lowercase with hyphens (e.g., `style-embedding`, `batch-creator`)
- Entry point: always `index.js`
- Handler export: `exports.handler`

### Documentation
- Markdown files: PascalCase or lowercase with underscores
- Technical docs: `design.md`, `requirements.md` (note: may be outdated)
- Diagrams: descriptive names (e.g., `architecture-diagram.md`)

## Configuration Files

### Root Level
- `package.json`: Node.js dependencies, uses pnpm as package manager
- `pnpm-lock.yaml`: Dependency lock file (commit to version control)
- `.npmrc`: npm/pnpm configuration
- `.gitignore`: Excludes node_modules, .terraform, sensitive files

### Infrastructure
- `infra/.terraform.lock.hcl`: Terraform provider versions (commit to version control)
- Terraform state: Stored remotely in S3 (not in repository)
- Backend config: S3 bucket `assetql-terraform-state` in ap-south-1

## Development Workflow

### Adding New Lambda Functions
1. Create directory: `lambdas/{function-name}/`
2. Create `index.js` with `exports.handler` async function
3. Import shared utilities:
   ```javascript
   const { dynamo, s3, sqs, bedrock, response,
           GetCommand, PutCommand, UpdateCommand,
           PutObjectCommand, GetObjectCommand } = require('../../shared');
   ```
4. Choose appropriate event source:
   - API Gateway: Extract `userId` from `event.requestContext.authorizer.claims.sub`
   - SQS: Parse `JSON.parse(event.Records[0].body)`
   - S3: Extract key from `event.Records[0].s3.object.key`
5. Add Terraform resource in appropriate module
6. Deploy via `terraform apply`

### Lambda Implementation Patterns

**API Gateway Handler:**
```javascript
exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const body = JSON.parse(event.body);
  // Business logic
  return response(201, { data });
};
```

**SQS Handler:**
```javascript
exports.handler = async (event) => {
  const record = event.Records[0];
  const { batchId, taskId, prompt, config } = JSON.parse(record.body);
  // Process message
  // No return needed for SQS
};
```

**S3 Event Handler:**
```javascript
exports.handler = async (event) => {
  const s3Record = event.Records[0].s3;
  const s3Key = decodeURIComponent(s3Record.object.key);
  const parts = s3Key.split('/');
  const assetId = parts[2].replace('.png', '');
  // Process S3 object
};
```

### Bedrock API Patterns

**Amazon Nova Lite (Vision + Text):**
```javascript
const payload = {
  messages: [{
    role: 'user',
    content: [
      { image: { format: 'png', source: { bytes: imageBuffer } } },
      { text: 'Analyze this image...' }
    ]
  }],
  inferenceConfig: { maxTokens: 1024, temperature: 0.3 }
};

const res = await bedrock.send(new InvokeModelCommand({
  modelId: 'amazon.nova-lite-v1:0',
  body: JSON.stringify(payload),
  contentType: 'application/json'
}));
const responseBody = JSON.parse(Buffer.from(res.body).toString());
const result = JSON.parse(responseBody.output.message.content[0].text);
```

**Stable Image Core:**
```javascript
const payload = {
  prompt: "detailed prompt",
  negative_prompt: "elements to avoid",
  aspect_ratio: "1:1",
  output_format: "png"
};

const res = await bedrock.send(new InvokeModelCommand({
  modelId: 'stability.stable-image-core-v1:0',
  body: JSON.stringify(payload),
  contentType: 'application/json',
  accept: 'application/json'
}));
const imgBody = JSON.parse(Buffer.from(res.body).toString());
const imageBase64 = imgBody.images[0];
```

### Image Processing with Sharp

```javascript
const sharp = require('sharp');

// Generate thumbnail
const thumbnailBuffer = await sharp(imageBuffer)
  .resize(256, 256, { fit: 'cover' })
  .jpeg({ quality: 80 })
  .toBuffer();
```

### Retry Logic Pattern

```javascript
// In image-generator Lambda
if (styleScore < threshold && retryCount < 3) {
  const sqsClient = new SQSClient({});
  await sqsClient.send(new SendMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify({ 
      batchId, taskId, prompt, styleProfileId, config, 
      retryCount: retryCount + 1 
    }),
    DelaySeconds: Math.pow(2, retryCount)  // 1s, 2s, 4s
  }));
  return;
}
```

## Data Flow

### Style Profile Creation
1. User uploads reference image → API Gateway
2. style-embedding Lambda saves to S3 (`style-references/`)
3. Nova Lite analyzes style
4. Style profile saved to DynamoDB (`AssetQL-styles`)

### Batch Generation
1. User submits CSV + template → API Gateway
2. batch-creator Lambda creates batch record
3. Creates task records and pushes to SQS (batches of 10)
4. image-generator Lambda consumes SQS messages
5. Generates images with Stable Image Core
6. Validates style with Nova Lite
7. Saves to S3 (`raw/{batchId}/{assetId}.png`)
8. S3 event triggers asset-tagger Lambda
9. Nova Lite tags image, sharp generates thumbnail
10. Updates asset record with tags and thumbnail

## Documentation Structure

Technical documentation is organized by purpose:
- **README.md**: Project overview, setup instructions, feature highlights
- **requirements.md**: Detailed requirements (may be outdated vs. code)
- **design.md**: System architecture (may be outdated vs. code)
- **architecture-diagram.md**: Visual architecture representation
- **AssetQL_Implementation_Plan.md**: Implementation roadmap
- **ProcessFlowDiagram.md**: Workflow sequences
- **IdeaBoard.png**: Visual concept board

**Note**: When code and documentation conflict, trust the actual code implementation.

Specifications for features are in `.kiro/specs/{feature-name}/`.
