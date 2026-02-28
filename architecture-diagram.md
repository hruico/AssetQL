# AssetQL AI - AWS Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS / CLIENTS                                 │
│                    (Game Devs, Agencies, Content Teams)                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                     │
│  ┌──────────────────┐         ┌──────────────────┐                         │
│  │  CloudFront CDN  │◄────────│  S3 Static Site  │                         │
│  │  (Global Edge)   │         │  (Next.js App)   │                         │
│  └────────┬─────────┘         └──────────────────┘                         │
└───────────┼──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API & AUTH LAYER                                    │
│  ┌──────────────────┐         ┌──────────────────┐                         │
│  │  API Gateway     │◄────────│  Cognito         │                         │
│  │  (REST API)      │         │  (User Auth)     │                         │
│  └────────┬─────────┘         └──────────────────┘                         │
└───────────┼──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPUTE LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Batch      │  │    Style     │  │   Image      │  │    Asset     │  │
│  │   Creator    │  │  Embedding   │  │  Generator   │  │   Tagger     │  │
│  │   Lambda     │  │   Lambda     │  │   Lambda     │  │   Lambda     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      QUEUE & WORKFLOW LAYER                                  │
│  ┌──────────────────┐         ┌──────────────────┐                         │
│  │  SQS Generation  │────────►│  Dead Letter     │                         │
│  │  Queue           │         │  Queue (DLQ)     │                         │
│  └────────┬─────────┘         └──────────────────┘                         │
│           │                                                                  │
│           │         ┌──────────────────┐                                    │
│           └────────►│  KIRO Workflow   │                                    │
│                     │  Orchestration   │                                    │
│                     └──────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI/ML LAYER                                       │
│  ┌──────────────────┐         ┌──────────────────┐                         │
│  │  AWS Bedrock     │         │  SageMaker       │                         │
│  │  (LLM/Tagging)   │         │  (Stable Diff)   │                         │
│  │  - Claude 3      │         │  - Image Gen     │                         │
│  │  - Auto-tagging  │         │  - Style Control │                         │
│  └──────────────────┘         └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          STORAGE LAYER                                       │
│  ┌──────────────────┐         ┌──────────────────┐                         │
│  │  S3 Buckets      │         │  DynamoDB Tables │                         │
│  │  ──────────      │         │  ───────────────  │                         │
│  │  • Assets        │         │  • Batches       │                         │
│  │  • Thumbnails    │         │  • Assets        │                         │
│  │  • Exports       │         │  • StyleProfiles │                         │
│  │  • References    │         │  • Tasks         │                         │
│  └──────────────────┘         └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MONITORING & LOGGING                                   │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐             │
│  │  CloudWatch      │  │   X-Ray      │  │  CloudTrail      │             │
│  │  Logs & Metrics  │  │   Tracing    │  │  Audit Logs      │             │
│  └──────────────────┘  └──────────────┘  └──────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

### 1. Batch Creation Flow
```
User → CloudFront → API Gateway → Cognito (Auth)
  ↓
API Gateway → BatchCreatorLambda
  ↓
BatchCreatorLambda → DynamoDB (Create Batch Record)
  ↓
BatchCreatorLambda → DynamoDB (Create Task Records)
  ↓
BatchCreatorLambda → SQS (Push Tasks to Queue)
```

### 2. Style Processing Flow
```
User Uploads Style Reference → API Gateway → StyleEmbeddingLambda
  ↓
StyleEmbeddingLambda → S3 (Store Reference Image)
  ↓
StyleEmbeddingLambda → Extract CLIP Embeddings
  ↓
StyleEmbeddingLambda → DynamoDB (Store Style Profile)
```

### 3. Image Generation Flow
```
SQS Queue → ImageGeneratorLambda (Triggered)
  ↓
ImageGeneratorLambda → DynamoDB (Get Style Profile)
  ↓
ImageGeneratorLambda → SageMaker (Generate Image)
  ↓
ImageGeneratorLambda → Validate Style Consistency
  ↓
  ├─ Pass → S3 (Store Image) → DynamoDB (Update Asset Record)
  └─ Fail → SQS (Re-queue) or DLQ (Max Retries)
```

### 4. Auto-Tagging Flow
```
S3 Event (New Image) → AssetTaggerLambda
  ↓
AssetTaggerLambda → Download Image from S3
  ↓
AssetTaggerLambda → Bedrock (Claude Vision Analysis)
  ↓
AssetTaggerLambda → Parse Tags & Categories
  ↓
AssetTaggerLambda → DynamoDB (Update Asset Metadata)
```

### 5. Export Flow
```
User Request → API Gateway → ExportLambda
  ↓
ExportLambda → S3 (Retrieve Assets)
  ↓
ExportLambda → Resize/Format for Platform
  ↓
ExportLambda → S3 (Store Export Package)
  ↓
ExportLambda → CloudFront (Generate Signed URL)
  ↓
Return Download Link to User
```

## Component Details

### Frontend Layer
- **CloudFront**: Global CDN for low-latency asset delivery
- **S3 Static Site**: Next.js application hosted as static site

### API & Auth Layer
- **API Gateway**: RESTful API endpoints with rate limiting
- **Cognito**: User authentication and JWT token management

### Compute Layer
- **BatchCreatorLambda**: Parses CSV, creates batch, queues tasks
- **StyleEmbeddingLambda**: Extracts style embeddings from references
- **ImageGeneratorLambda**: Generates images via SageMaker
- **AssetTaggerLambda**: Auto-tags images using Bedrock

### Queue & Workflow Layer
- **SQS Generation Queue**: Distributes generation tasks
- **Dead Letter Queue**: Captures failed tasks after retries
- **KIRO Orchestration**: Manages workflow coordination

### AI/ML Layer
- **AWS Bedrock**: LLM for tagging and prompt optimization
- **SageMaker**: Hosts Stable Diffusion for image generation

### Storage Layer
- **S3 Buckets**: 
  - `raw/`: Original generated images
  - `thumbnails/`: Optimized previews
  - `exports/`: Export packages
  - `style-references/`: User-uploaded references
- **DynamoDB Tables**:
  - `Batches`: Batch metadata and progress
  - `Assets`: Asset metadata, tags, categories
  - `StyleProfiles`: Style embeddings and parameters
  - `Tasks`: Individual generation task status

### Monitoring Layer
- **CloudWatch**: Logs, metrics, alarms
- **X-Ray**: Distributed tracing
- **CloudTrail**: Audit logging

## Scalability Features

1. **Horizontal Scaling**: Lambda auto-scales based on queue depth
2. **Queue-Based Decoupling**: Async processing prevents bottlenecks
3. **CDN Distribution**: Global edge caching for fast delivery
4. **DynamoDB On-Demand**: Auto-scales with traffic
5. **Multi-AZ Deployment**: High availability across zones

## Security Features

1. **IAM Roles**: Least privilege access for all services
2. **Encryption**: At-rest (S3, DynamoDB) and in-transit (TLS)
3. **Private S3**: Assets only accessible via CloudFront
4. **API Authentication**: JWT tokens via Cognito
5. **Rate Limiting**: Prevents abuse and controls costs

## Cost Optimization

1. **Serverless Architecture**: Pay-per-use, no idle costs
2. **S3 Lifecycle Policies**: Archive old assets to Glacier
3. **Lambda Concurrency Limits**: Prevent runaway costs
4. **CloudFront Caching**: Reduces origin requests
5. **DynamoDB On-Demand**: No over-provisioning

---

**Note**: This architecture is designed for the hackathon MVP. Post-MVP enhancements include multi-region deployment, advanced caching strategies, and custom model fine-tuning.
