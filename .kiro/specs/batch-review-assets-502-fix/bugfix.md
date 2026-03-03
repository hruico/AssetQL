# Bugfix Requirements Document

## Introduction

The AssetQL platform's Batch Review phase is currently blocked by a 502 Bad Gateway error when attempting to load assets for review. This bug prevents users from viewing generated assets during the critical batch review workflow, effectively halting the iterative refinement process. The endpoint `GET /api/v1/feedback/{sessionId}/assets` is failing at the Lambda function level, indicating a backend execution error rather than a network or API Gateway configuration issue.

The bug impacts the core user workflow: after generating a test batch in the Single Iteration phase, users transition to Batch Review to evaluate results and provide feedback. Without the ability to view assets, the entire feedback loop is broken.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user in the BATCH_REVIEW phase requests `GET /api/v1/feedback/{sessionId}/assets` THEN the system returns a 502 Bad Gateway error

1.2 WHEN the feedback-handler Lambda executes the `getSessionAssets` function THEN the system fails to complete the request within the timeout period or encounters a runtime error

1.3 WHEN the Lambda queries DynamoDB for batches using the `userId-createdAt-index` THEN the system may fail due to missing environment variables, incorrect table names, or query syntax errors

1.4 WHEN the Lambda queries DynamoDB for assets using the `batchId-createdAt-index` THEN the system may fail due to index configuration issues or malformed query parameters

### Expected Behavior (Correct)

2.1 WHEN a user in the BATCH_REVIEW phase requests `GET /api/v1/feedback/{sessionId}/assets` THEN the system SHALL return a 200 OK response with session details, batch information, and an array of assets

2.2 WHEN the feedback-handler Lambda executes the `getSessionAssets` function THEN the system SHALL successfully retrieve the session, identify the associated batchId, query for assets, and return the complete dataset within the 120-second timeout

2.3 WHEN the Lambda queries DynamoDB for batches using the `userId-createdAt-index` THEN the system SHALL successfully execute the query with correct table names and return matching batch records

2.4 WHEN the Lambda queries DynamoDB for assets using the `batchId-createdAt-index` THEN the system SHALL successfully execute the query and return all assets associated with the batch

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user requests `POST /api/v1/feedback/{sessionId}` to submit feedback THEN the system SHALL CONTINUE TO process feedback and invoke the PromptEngineerAgent successfully

3.2 WHEN a user requests `GET /api/v1/feedback/{sessionId}` to retrieve feedback history THEN the system SHALL CONTINUE TO return the complete feedback history for the session

3.3 WHEN the feedback-handler Lambda verifies user ownership of a session THEN the system SHALL CONTINUE TO enforce authorization checks and return 403 Forbidden for unauthorized access

3.4 WHEN the Lambda handles sessions without an associated batchId THEN the system SHALL CONTINUE TO search for recent user batches and return an appropriate message if none are found

3.5 WHEN the Lambda encounters a non-existent session or batch THEN the system SHALL CONTINUE TO return 404 Not Found with descriptive error messages
