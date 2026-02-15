# AssetQL AI - Process Flow Diagram

## Large-Scale Consistent AI Image Production Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AssetQL AI PRODUCTION PIPELINE                       │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │  Source Theme &  │
                              │   Description    │
                              │                  │
                              │ • CSV Upload     │
                              │ • Style Refs     │
                              │ • Batch Config   │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  Extract Brand   │
                              │      DNA         │
                              │                  │
                              │ • CLIP Embedding │
                              │ • Color Palette  │
                              │ • Style Params   │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ AI Orchestrator  │
                              │ Generate Master  │
                              │     Prompt       │
                              │                  │
                              │ • Template Apply │
                              │ • Variable Sub   │
                              │ • Style Inject   │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  CLIP Agent      │
                              │   Validation     │
                              │                  │
                              │ • Prompt Check   │
                              │ • Style Align    │
                              │ • Confidence     │
                              └────────┬─────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
              Low Confidence      High Confidence        │
                    │                  │                  │
                    ▼                  ▼                  │
         ┌──────────────────┐  ┌──────────────────┐     │
         │  Delta Report    │  │   Validated      │     │
         │  (For Analysis)  │  │  Screen Prompt   │     │
         │                  │  │                  │     │
         │ • Gap Analysis   │  │ • Ready for Gen  │     │
         │ • Refinement     │  │ • Queue Task     │     │
         └──────────────────┘  └────────┬─────────┘     │
                                        │                │
                                        ▼                │
                              ┌──────────────────┐       │
                              │  Batch Image     │       │
                              │  Generation      │       │
                              │     (SDXL)       │       │
                              │                  │       │
                              │ • SageMaker      │       │
                              │ • Stable Diff    │       │
                              │ • Parallel Gen   │       │
                              └────────┬─────────┘       │
                                       │                 │
                                       ▼                 │
                              ┌──────────────────┐       │
                              │  VLM Validator   │       │
                              │    Analysis      │       │
                              │                  │       │
                              │ • CLIP Compare   │       │
                              │ • Style Score    │       │
                              │ • Quality Check  │       │
                              └────────┬─────────┘       │
                                       │                 │
                                       ▼                 │
                              ┌──────────────────┐       │
                              │  Match Source    │       │
                              │     Theme?       │       │
                              │                  │       │
                              │ Threshold: 85%   │       │
                              └────────┬─────────┘       │
                                       │                 │
                    ┌──────────────────┼──────────────────┘
                    │                  │
                Fail (retry)         Pass
                    │                  │
                    ▼                  ▼
         ┌──────────────────┐  ┌──────────────────┐
         │  Fallback:       │  │   Verified       │
         │  Prompt          │  │   Production     │
         │  Refinement      │  │     Asset        │
         │                  │  │                  │
         │ • Retry (3x)     │  │ • Style Match    │
         │ • Adjust Params  │  │ • High Quality   │
         │ • DLQ if fail    │  │ • S3 Storage     │
         └──────────────────┘  └────────┬─────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  Bulk            │
                              │  Exportation &   │
                              │     Tagging      │
                              │                  │
                              │ • Auto-Tag       │
                              │ • Categorize     │
                              │ • Metadata       │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │   Production     │
                              │    Database      │
                              │                  │
                              │ • Asset Library  │
                              │ • Search Index   │
                              │ • Export Ready   │
                              └──────────────────┘
```

## Detailed Process Steps

### Step 1: Source Theme & Description
**Input**: User provides batch requirements
- CSV file with 100-500 prompts
- Style reference images (1-5 images)
- Batch configuration (dimensions, quality, model)

**Processing**:
- Frontend validates CSV format
- API Gateway receives upload request
- BatchCreatorLambda parses inputs

**Output**: Validated batch configuration ready for processing

---

### Step 2: Extract Brand DNA
**Input**: Style reference images

**Processing**:
- StyleEmbeddingLambda downloads reference images
- CLIP model extracts 768-dimensional embeddings
- Color palette extraction via k-means clustering
- Composition analysis (symmetry, rule of thirds)
- Texture and lighting parameter extraction

**Output**: Style profile with embeddings and locked parameters
- Stored in DynamoDB StyleProfiles table
- styleProfileId returned for batch association

---

### Step 3: AI Orchestrator - Generate Master Prompt
**Input**: 
- CSV row data
- Prompt template
- Style profile

**Processing**:
- Template engine substitutes variables from CSV
- Style modifiers injected based on locked parameters
- Bedrock (Claude) optimizes prompt for better generation
- Negative prompts added for quality control

**Output**: Optimized generation-ready prompts
- Each prompt tagged with taskId
- Pushed to SQS generation queue

---

### Step 4: CLIP Agent Validation
**Input**: Generated prompt + style embedding

**Processing**:
- CLIP text encoder processes prompt
- Semantic similarity check with style embedding
- Confidence score calculated (0-1 scale)
- Threshold: 0.75 for prompt quality

**Decision**:
- **High Confidence (≥0.75)**: Proceed to generation
- **Low Confidence (<0.75)**: Generate delta report

**Delta Report** (Low Confidence Path):
- Identifies gaps between prompt and style
- Suggests refinements
- Logged for analysis
- User notified of potential issues

**Output**: Validated prompts ready for image generation

---

### Step 5: Validated Screen Prompt
**Status**: Prompt approved for generation

**Processing**:
- Task marked as "processing" in DynamoDB
- SQS message consumed by ImageGeneratorLambda
- Generation parameters finalized

**Output**: Task queued for batch generation

---

### Step 6: Batch Image Generation (SDXL)
**Input**: Validated prompt + style embedding + config

**Processing**:
- ImageGeneratorLambda invokes SageMaker endpoint
- Stable Diffusion XL generates image
- Style embedding conditions generation via ControlNet
- Generation parameters:
  - Steps: 30-50
  - Guidance scale: 7-9
  - Dimensions: User-configured
  - Seed: Random or fixed

**Parallel Processing**:
- 10 concurrent Lambda invocations
- Queue-based load balancing
- Progress tracking per task

**Output**: Raw generated image (base64 encoded)

---

### Step 7: VLM Validator Analysis
**Input**: Generated image + reference style embedding

**Processing**:
- Extract CLIP embedding from generated image
- Calculate cosine similarity with reference
- Color histogram distance analysis
- Edge detection similarity check
- Composite style score calculation

**Metrics**:
- CLIP similarity: 0-1 (target: ≥0.85)
- Color distance: 0-100 (target: ≤15)
- Edge similarity: 0-1 (target: ≥0.80)
- Overall style score: Weighted average

**Output**: Style validation score + detailed metrics

---

### Step 8: Match Source Theme? (Decision Point)
**Input**: Style score from VLM validator

**Decision Logic**:
```
IF style_score >= 0.85 THEN
    PASS → Verified Production Asset
ELSE IF retry_count < 3 THEN
    FAIL → Fallback: Prompt Refinement
ELSE
    FAIL → Dead Letter Queue (Manual Review)
END IF
```

**Pass Criteria**:
- Style score ≥ 85%
- No critical quality issues
- Dimensions match requirements

**Fail Criteria**:
- Style score < 85%
- Visual artifacts detected
- Generation errors

---

### Step 9A: Fallback - Prompt Refinement (Fail Path)
**Input**: Failed generation + style gap analysis

**Processing**:
- Increment retry counter
- Analyze style deviation
- Adjust generation parameters:
  - Increase guidance scale
  - Modify prompt emphasis
  - Adjust style weight
- Re-queue to SQS with updated parameters

**Retry Strategy**:
- Attempt 1: Increase guidance scale by 1
- Attempt 2: Modify prompt with style keywords
- Attempt 3: Reduce generation steps, increase style weight
- After 3 attempts: Move to DLQ

**Output**: Refined task re-queued or moved to DLQ

---

### Step 9B: Verified Production Asset (Pass Path)
**Input**: Generated image with passing style score

**Processing**:
- Upload image to S3 (`raw/{batchId}/{assetId}.png`)
- Generate assetId (UUID)
- Create asset record in DynamoDB Assets table
- Update task status to "completed"
- Increment batch completedTasks counter
- Trigger S3 event for post-processing

**Metadata Stored**:
- assetId, batchId, userId
- S3 key, file size, dimensions
- Prompt, style score, generation params
- Timestamp, version

**Output**: Asset stored and indexed

---

### Step 10: Bulk Exportation & Tagging
**Input**: Verified production asset in S3

**Processing**:

**Auto-Tagging** (AssetTaggerLambda):
- S3 event triggers Lambda
- Download image from S3
- Bedrock (Claude Vision) analyzes image
- Extract tags: objects, colors, mood, style, composition
- Minimum 5 tags per image
- Tag confidence scores calculated

**Categorization**:
- Primary category from scene type
- Subcategories from objects
- User can override auto-categorization

**Thumbnail Generation**:
- Resize to 256x256 for preview
- Optimize compression (JPEG, 80% quality)
- Upload to S3 `thumbnails/` folder

**Metadata Update**:
- Update Assets table with tags and category
- Add thumbnail S3 key
- Mark asset as "ready for export"

**Output**: Fully tagged and categorized asset

---

### Step 11: Production Database
**Input**: Tagged and categorized assets

**Storage Structure**:

**DynamoDB Assets Table**:
- Indexed by assetId (primary key)
- GSI: batchId-createdAt-index
- GSI: userId-category-index
- Full-text search on tags

**Search Capabilities**:
- Filter by: batch, category, tags, date range
- Sort by: date, style score, name
- Visual similarity search (CLIP embeddings)

**Export Options**:
- Individual download
- Bulk ZIP download
- Platform-specific export (Unity, Shopify, etc.)
- CDN links via CloudFront

**Asset Lifecycle**:
- Active: Available in library
- Archived: Moved to S3 Glacier after 90 days
- Deleted: Soft delete with version retention

**Output**: Production-ready asset library

---

## Key Performance Indicators

### Throughput
- **Batch Processing**: 100 assets in <30 minutes
- **Queue Processing**: <5 seconds per task dispatch
- **Generation Time**: 5-15 seconds per image

### Quality
- **Style Consistency**: 85%+ similarity score
- **Success Rate**: 95%+ tasks completed
- **Retry Rate**: <10% tasks require retry

### Reliability
- **Uptime**: 99.5% availability
- **Error Rate**: <5% Lambda errors
- **DLQ Rate**: <1% tasks to dead letter queue

---

## Error Handling & Recovery

### Generation Failures
1. **Transient Errors** (timeout, rate limit):
   - Exponential backoff: 1s, 2s, 4s
   - Retry up to 3 times
   - Success rate: 90%+

2. **Style Deviation**:
   - Automatic parameter adjustment
   - Prompt refinement
   - Re-generation with increased style weight

3. **Permanent Failures**:
   - Move to DLQ after 3 attempts
   - Alert sent to user
   - Manual review option

### System Failures
1. **SageMaker Endpoint Down**:
   - Queue tasks until recovery
   - Notify user of delay
   - Fallback to Bedrock if available

2. **S3 Storage Issues**:
   - Retry uploads with exponential backoff
   - Use multi-part upload for large files
   - Verify upload integrity

3. **DynamoDB Throttling**:
   - Automatic retry with backoff
   - Request capacity increase if persistent
   - Use batch write operations

---

## Monitoring & Observability

### Real-Time Metrics
- Queue depth and processing rate
- Lambda invocations and errors
- SageMaker endpoint latency
- Style score distribution

### Dashboards
- Batch progress overview
- Task-level status grid
- Error rate trends
- Cost tracking

### Alerts
- High error rate (>5%)
- DLQ messages (>10)
- Queue depth (>1000)
- Cost threshold exceeded

---

## Optimization Strategies

### Cost Optimization
- Lambda concurrency limits (max 10)
- SageMaker auto-scaling (1-3 instances)
- S3 lifecycle policies (Glacier after 90 days)
- CloudFront caching (reduce origin requests)

### Performance Optimization
- Parallel Lambda invocations
- Batch inference where possible
- CloudFront edge caching
- DynamoDB query optimization

### Quality Optimization
- Style deviation scoring
- Automatic prompt refinement
- Multi-stage validation
- User feedback loop

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-15  
**Status**: Production Ready  
**Owner**: AssetQL AI Team
