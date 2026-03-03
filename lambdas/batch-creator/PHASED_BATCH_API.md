# Phased Batch Generation API

## Overview

The batch-creator Lambda now supports phased batch generation, allowing you to create a test batch first (subset of items) before generating the full batch.

## Test Batch Size Logic

- **100+ items**: 10% of total (e.g., 100 items → 10 test images)
- **10-99 items**: At least 10 items (e.g., 50 items → 10 test images)
- **< 10 items**: 30% of total (e.g., 6 items → 2 test images)

## API Usage

### 1. Create Test Batch (Default)

```json
POST /api/v1/batches
{
  "styleProfileId": "style-123",
  "csvRows": [...100 items...],
  "template": "A {style} illustration of {item_name}",
  "config": { "width": 1024, "height": 1024 },
  "batchName": "Product Images - Test",
  "phase": "test"
}
```

**Response:**
```json
{
  "batchId": "batch-abc",
  "totalTasks": 10,
  "phase": "test",
  "totalCsvRows": 100,
  "message": "Test batch created successfully"
}
```

### 2. Create Full Batch (After Test Approval)

```json
POST /api/v1/batches
{
  "styleProfileId": "style-123",
  "csvRows": [...100 items...],
  "template": "A {style} illustration of {item_name}",
  "config": { "width": 1024, "height": 1024 },
  "batchName": "Product Images - Full",
  "phase": "full",
  "parentBatchId": "batch-abc"
}
```

**Response:**
```json
{
  "batchId": "batch-xyz",
  "totalTasks": 100,
  "phase": "full",
  "message": "Full batch created successfully"
}
```

## Batch Record Schema

### Test Batch
```json
{
  "batchId": "batch-abc",
  "userId": "user-123",
  "name": "Product Images - Test",
  "status": "queued",
  "totalTasks": 10,
  "completedTasks": 0,
  "failedTasks": 0,
  "styleProfileId": "style-123",
  "config": {...},
  "phase": "test",
  "totalCsvRows": 100,
  "createdAt": 1234567890
}
```

### Full Batch
```json
{
  "batchId": "batch-xyz",
  "userId": "user-123",
  "name": "Product Images - Full",
  "status": "queued",
  "totalTasks": 100,
  "completedTasks": 0,
  "failedTasks": 0,
  "styleProfileId": "style-123",
  "config": {...},
  "phase": "full",
  "parentBatchId": "batch-abc",
  "createdAt": 1234567891
}
```

## Frontend Integration Example

```typescript
// 1. Create test batch
const testBatchResponse = await fetch('/api/v1/batches', {
  method: 'POST',
  body: JSON.stringify({
    styleProfileId,
    csvRows: allCsvRows,
    template,
    config,
    batchName: `${baseName} - Test`,
    phase: 'test'
  })
});

const { batchId: testBatchId, totalTasks, totalCsvRows } = await testBatchResponse.json();

// 2. Wait for test batch completion and user approval
// ... poll batch status, show results to user ...

// 3. If approved, create full batch
const fullBatchResponse = await fetch('/api/v1/batches', {
  method: 'POST',
  body: JSON.stringify({
    styleProfileId,
    csvRows: allCsvRows,
    template,
    config,
    batchName: `${baseName} - Full`,
    phase: 'full',
    parentBatchId: testBatchId
  })
});
```

## Benefits

1. **Cost Savings**: Test prompt/style on 10% of items before committing to full generation
2. **Quality Control**: Validate style consistency before bulk generation
3. **Faster Iteration**: Quick feedback loop for prompt refinement
4. **User Confidence**: See results before investing in full batch
