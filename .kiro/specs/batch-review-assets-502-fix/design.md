# Batch Review Assets 502 Error Bugfix Design

## Overview

The feedback-handler Lambda's `getSessionAssets` function is returning a 502 Bad Gateway error when users attempt to view assets during the Batch Review phase. Analysis of the code reveals the root cause: the Lambda function code references environment variables (`BATCHES_TABLE_NAME`, `ASSETS_TABLE_NAME`) that are correctly configured in Terraform, and all required DynamoDB indexes exist. The 502 error is most likely caused by one of three issues: (1) the Lambda deployment package is outdated and doesn't include the latest code, (2) a runtime error occurs due to malformed data in DynamoDB, or (3) the Lambda times out due to inefficient queries or large result sets.

The fix strategy is to redeploy the Lambda with the current code, add defensive error handling and logging, and optimize the query patterns to prevent timeouts.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the 502 error - when a user requests GET /api/v1/feedback/{sessionId}/assets
- **Property (P)**: The desired behavior - the endpoint returns 200 OK with session, batch, and assets data within 120 seconds
- **Preservation**: All other feedback-handler endpoints (POST feedback, GET feedback history) must continue working unchanged
- **getSessionAssets**: The function in `lambdas/feedback-handler/index.js` that retrieves assets for batch review
- **userId-createdAt-index**: GSI on AssetQL-batches table used to find user's recent batches
- **batchId-createdAt-index**: GSI on AssetQL-assets table used to retrieve all assets for a batch

## Bug Details

### Fault Condition

The bug manifests when a user in the BATCH_REVIEW phase requests asset data via GET /api/v1/feedback/{sessionId}/assets. The Lambda function either fails to execute due to a deployment issue, encounters a runtime error from malformed data, or times out while querying large datasets.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type HTTPRequest
  OUTPUT: boolean
  
  RETURN input.httpMethod == 'GET'
         AND input.path CONTAINS '/api/v1/feedback/'
         AND input.path CONTAINS '/assets'
         AND input.pathParameters.sessionId EXISTS
         AND (lambdaDeploymentOutdated OR runtimeErrorOccurs OR queryTimeout)
END FUNCTION
```

### Examples

- User requests `GET /api/v1/feedback/sess-123/assets` → receives 502 Bad Gateway
- User in BATCH_REVIEW phase clicks "View Assets" → frontend displays "Failed to load assets"
- Lambda CloudWatch logs show no execution or show timeout after 120 seconds
- Lambda CloudWatch logs show "Cannot read property 'length' of undefined" or similar runtime error

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- POST /api/v1/feedback/{sessionId} must continue to submit feedback and invoke PromptEngineerAgent successfully
- GET /api/v1/feedback/{sessionId} must continue to return feedback history
- Authorization checks (403 Forbidden for non-owners) must continue to work
- 404 responses for non-existent sessions/batches must continue to work

**Scope:**
All inputs that do NOT involve the GET /assets endpoint should be completely unaffected by this fix. This includes:
- Feedback submission workflow
- Feedback history retrieval
- Session ownership verification
- Agent invocation logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Outdated Lambda Deployment**: The Lambda deployment package (feedback-handler.zip) may not contain the latest code from `lambdas/feedback-handler/index.js`
   - The Terraform configuration references the correct environment variables
   - The code logic appears sound
   - A stale deployment would cause the Lambda to fail with outdated or missing code

2. **Runtime Error from Malformed Data**: The Lambda may encounter unexpected data structures in DynamoDB
   - Missing or null values in batch/asset records
   - Unexpected data types (string instead of number for createdAt)
   - Empty or malformed Items arrays from QueryCommand

3. **Query Timeout**: The Lambda may timeout when querying large datasets
   - Batches with 500+ assets could take significant time to retrieve
   - No pagination implemented for asset queries
   - 120-second timeout may be insufficient for large batches

4. **Missing Error Handling**: The code lacks try-catch blocks around DynamoDB operations
   - Any DynamoDB error would bubble up as an unhandled exception
   - API Gateway interprets unhandled Lambda errors as 502

## Correctness Properties

Property 1: Fault Condition - Assets Endpoint Returns Successfully

_For any_ HTTP GET request to /api/v1/feedback/{sessionId}/assets where the session exists and the user is authorized, the fixed Lambda function SHALL return a 200 OK response with session details, batch information, and an array of assets (or empty array with explanatory message) within 120 seconds.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Other Endpoints Unchanged

_For any_ HTTP request that is NOT a GET to the /assets endpoint (feedback submission, feedback history retrieval), the fixed Lambda SHALL produce exactly the same behavior as the original Lambda, preserving all existing functionality for feedback workflows and agent invocation.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `lambdas/feedback-handler/index.js`

**Function**: `getSessionAssets`

**Specific Changes**:
1. **Add Comprehensive Error Handling**: Wrap all DynamoDB operations in try-catch blocks
   - Catch and log specific errors for each query
   - Return descriptive 500 responses instead of letting errors bubble up
   - Add null checks for all DynamoDB response Items

2. **Add Defensive Logging**: Enhance console.log statements for debugging
   - Log environment variables at function start
   - Log each DynamoDB query with parameters
   - Log response sizes and timing information

3. **Add Pagination Support**: Implement pagination for large asset queries
   - Add Limit parameter to asset query (e.g., 100 assets per page)
   - Add LastEvaluatedKey handling for pagination
   - Return pagination metadata in response

4. **Add Data Validation**: Validate DynamoDB response structures
   - Check if Items array exists before accessing length
   - Validate that required fields exist in batch/asset records
   - Handle edge cases (empty batches, missing batchId)

5. **Redeploy Lambda**: Package and deploy the updated code
   - Run deployment script to create feedback-handler.zip
   - Apply Terraform to update Lambda function
   - Verify deployment in AWS Console

**File**: `scripts/deploy-lambda.sh` (if doesn't exist, create it)

**Purpose**: Automate Lambda packaging and deployment

**Changes**:
- Create script to zip Lambda functions
- Include node_modules from shared layer
- Upload to S3 or use local file for Terraform

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, reproduce the 502 error on the unfixed code to confirm the root cause, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Reproduce the 502 error BEFORE implementing the fix to confirm the root cause hypothesis.

**Test Plan**: Manually test the GET /assets endpoint with various scenarios. Check CloudWatch logs for error messages, timeouts, or missing executions.

**Test Cases**:
1. **Session with batchId**: Request assets for a session that has a batchId (will fail with 502 on unfixed code)
2. **Session without batchId**: Request assets for a session without batchId (will fail with 502 on unfixed code)
3. **Large Batch**: Request assets for a batch with 100+ assets (may timeout on unfixed code)
4. **Empty Batch**: Request assets for a batch with 0 assets (may fail with runtime error on unfixed code)

**Expected Counterexamples**:
- 502 Bad Gateway responses
- CloudWatch logs showing: "Task timed out after 120.00 seconds"
- CloudWatch logs showing: "Cannot read property 'length' of undefined"
- CloudWatch logs showing: Missing environment variable errors

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  response := getSessionAssets_fixed(request)
  ASSERT response.statusCode == 200
  ASSERT response.body.session EXISTS
  ASSERT response.body.batch EXISTS OR response.body.message EXISTS
  ASSERT response.body.assets IS_ARRAY
  ASSERT response.body.totalAssets IS_NUMBER
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT feedbackHandler_original(request) = feedbackHandler_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Test the POST feedback and GET feedback history endpoints on UNFIXED code to capture expected behavior, then verify the same behavior after fix.

**Test Cases**:
1. **Feedback Submission Preservation**: Submit feedback with various payloads (with/without assetId, with/without rating) and verify identical behavior
2. **Feedback History Preservation**: Retrieve feedback history for sessions with 0, 1, and multiple feedback entries and verify identical responses
3. **Authorization Preservation**: Test 403 Forbidden responses for unauthorized users and verify identical behavior
4. **404 Preservation**: Test 404 responses for non-existent sessions and verify identical behavior

### Unit Tests

- Test getSessionAssets with valid sessionId and batchId
- Test getSessionAssets with valid sessionId but no batchId (fallback to recent batches)
- Test getSessionAssets with non-existent sessionId (404)
- Test getSessionAssets with unauthorized userId (403)
- Test getSessionAssets with empty batch (0 assets)
- Test getSessionAssets with large batch (100+ assets, pagination)
- Test error handling for DynamoDB query failures
- Test timeout handling for slow queries

### Property-Based Tests

- Generate random session configurations (with/without batchId) and verify 200 OK responses
- Generate random batch sizes (0 to 500 assets) and verify correct totalAssets count
- Generate random userId combinations and verify authorization checks work correctly
- Test that all non-GET-assets requests continue to work across many scenarios

### Integration Tests

- Test full Batch Review workflow: create session → generate batch → request assets
- Test session without batch: create session → request assets → verify fallback to recent batches
- Test feedback submission after viewing assets
- Test that CloudWatch logs contain expected debug information
- Test that Lambda completes within timeout for various batch sizes
