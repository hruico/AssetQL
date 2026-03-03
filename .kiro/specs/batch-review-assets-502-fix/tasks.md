# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Assets Endpoint Returns 502 on Unfixed Code
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that GET /api/v1/feedback/{sessionId}/assets returns 502 Bad Gateway on unfixed code
  - Test with various scenarios: session with batchId, session without batchId, large batch (100+ assets), empty batch (0 assets)
  - The test assertions should match the Expected Behavior Properties from design:
    - Assert response.statusCode == 200 (will fail on unfixed code)
    - Assert response.body.session EXISTS
    - Assert response.body.batch EXISTS OR response.body.message EXISTS
    - Assert response.body.assets IS_ARRAY
    - Assert response.body.totalAssets IS_NUMBER
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - 502 Bad Gateway responses
    - CloudWatch logs showing timeouts, runtime errors, or missing executions
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Endpoints Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (POST feedback, GET feedback history)
  - Test cases to observe:
    - POST /api/v1/feedback/{sessionId} with various payloads (with/without assetId, with/without rating)
    - GET /api/v1/feedback/{sessionId} for sessions with 0, 1, and multiple feedback entries
    - Authorization checks (403 Forbidden for non-owners)
    - 404 responses for non-existent sessions
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Feedback submission workflow produces identical responses
    - Feedback history retrieval produces identical responses
    - Authorization checks produce identical 403 responses
    - 404 responses for non-existent resources are identical
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for Batch Review Assets 502 Error

  - [x] 3.1 Add comprehensive error handling to getSessionAssets function
    - Wrap all DynamoDB operations in try-catch blocks
    - Catch and log specific errors for each query (session query, batch query, assets query)
    - Return descriptive 500 responses instead of letting errors bubble up as 502
    - Add null checks for all DynamoDB response Items arrays
    - _Bug_Condition: isBugCondition(input) where input.httpMethod == 'GET' AND input.path CONTAINS '/assets' AND (lambdaDeploymentOutdated OR runtimeErrorOccurs OR queryTimeout)_
    - _Expected_Behavior: response.statusCode == 200 AND response.body.session EXISTS AND response.body.assets IS_ARRAY_
    - _Preservation: POST feedback and GET feedback history endpoints unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Add defensive logging for debugging
    - Log environment variables at function start (SESSIONS_TABLE_NAME, BATCHES_TABLE_NAME, ASSETS_TABLE_NAME)
    - Log each DynamoDB query with parameters (TableName, IndexName, KeyConditionExpression)
    - Log response sizes and timing information (Items.length, query duration)
    - Log any errors with full stack traces
    - _Requirements: 2.4_

  - [x] 3.3 Add pagination support for large asset queries
    - Add Limit parameter to asset query (100 assets per page)
    - Add LastEvaluatedKey handling for pagination
    - Return pagination metadata in response (totalAssets, hasMore, nextToken)
    - Ensure queries complete within 120-second timeout
    - _Requirements: 2.3_

  - [x] 3.4 Add data validation for DynamoDB responses
    - Check if Items array exists before accessing length
    - Validate that required fields exist in batch/asset records (batchId, assetId, s3Key)
    - Handle edge cases: empty batches, missing batchId in session
    - Return descriptive messages for edge cases (e.g., "No batch associated with this session yet")
    - _Requirements: 2.2, 2.3_

  - [x] 3.5 Redeploy Lambda with updated code
    - Package feedback-handler Lambda with latest code
    - Create or update scripts/deploy-lambda.sh for automated deployment
    - Apply Terraform to update Lambda function
    - Verify deployment in AWS Console (check Last Modified timestamp)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Assets Endpoint Returns 200 OK
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify all scenarios pass: session with batchId, session without batchId, large batch, empty batch
    - _Requirements: Expected Behavior Properties from design (2.1, 2.2, 2.3, 2.4)_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Endpoints Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix:
      - POST feedback endpoint works identically
      - GET feedback history endpoint works identically
      - Authorization checks work identically
      - 404 responses work identically

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all tests (exploration test + preservation tests)
  - Verify all tests pass
  - Check CloudWatch logs for expected debug information
  - Test full Batch Review workflow end-to-end
  - Ask the user if questions arise
