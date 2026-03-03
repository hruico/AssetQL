# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Assets Missing Presigned URLs
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - assets returned by getSessionAssets without s3Url/thumbnailUrl fields
  - Test that GET /api/v1/feedback/{sessionId}/assets returns assets with s3Key but no s3Url field
  - Test that assets with thumbnailKey are returned without thumbnailUrl field
  - Test assertions should match Expected Behavior: assets MUST include s3Url and thumbnailUrl fields with valid presigned URLs
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Asset with s3Key 'raw/batch-123/asset-456.png' returned without s3Url field")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Asset Endpoints Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-asset-retrieval requests
  - Observe: POST /api/v1/feedback/{sessionId} (feedback submission) works correctly on unfixed code
  - Observe: GET /api/v1/feedback/{sessionId} (feedback history) works correctly on unfixed code
  - Observe: Session ownership verification (403 Forbidden for unauthorized users) works correctly on unfixed code
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for asset image display bug

  - [x] 3.1 Add presigned URL generation imports
    - Import `getSignedUrl` from `@aws-sdk/s3-request-presigner`
    - Import `GetObjectCommand` from `@aws-sdk/client-s3` (already in shared)
    - Add imports at top of `lambdas/feedback-handler/index.js`
    - _Bug_Condition: isBugCondition(asset) where asset has s3Key/thumbnailKey but no s3Url/thumbnailUrl_
    - _Expected_Behavior: Assets include s3Url and thumbnailUrl fields with valid presigned URLs (1-hour expiration)_
    - _Preservation: Feedback submission, history retrieval, session ownership, and agent invocation remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Transform assets array with presigned URLs
    - After line 118 in getSessionAssets function (after assets are retrieved from DynamoDB)
    - Map over assetsRes.Items array to generate presigned URLs for each asset
    - For each asset with s3Key, call getSignedUrl with GetObjectCommand to generate s3Url (3600 second expiration)
    - For each asset with thumbnailKey, call getSignedUrl with GetObjectCommand to generate thumbnailUrl (3600 second expiration)
    - Handle missing thumbnailKey gracefully (set thumbnailUrl to null)
    - Wrap URL generation in try-catch to return original asset if generation fails
    - Use Promise.all to generate URLs in parallel for performance
    - _Bug_Condition: isBugCondition(asset) where asset has s3Key/thumbnailKey but no s3Url/thumbnailUrl_
    - _Expected_Behavior: Assets include s3Url and thumbnailUrl fields with valid presigned URLs (1-hour expiration)_
    - _Preservation: Feedback submission, history retrieval, session ownership, and agent invocation remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 Update response to use transformed assets
    - Replace `assets: assetsRes.Items` with `assets: assetsWithUrls` in response object
    - Update totalAssets count to use assetsWithUrls.length
    - Ensure response format matches assets-handler pattern for consistency
    - _Bug_Condition: isBugCondition(asset) where asset has s3Key/thumbnailKey but no s3Url/thumbnailUrl_
    - _Expected_Behavior: Assets include s3Url and thumbnailUrl fields with valid presigned URLs (1-hour expiration)_
    - _Preservation: Feedback submission, history retrieval, session ownership, and agent invocation remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Assets Include Presigned URLs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify assets now include s3Url and thumbnailUrl fields
    - Verify URLs start with "https://" and contain the s3Key/thumbnailKey
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Asset Endpoints Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm feedback submission still works correctly
    - Confirm feedback history retrieval still works correctly
    - Confirm session ownership verification still works correctly
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all tests (exploration + preservation)
  - Verify bug condition test passes (assets include presigned URLs)
  - Verify preservation tests pass (no regressions in feedback workflows)
  - Ensure all tests pass, ask the user if questions arise
