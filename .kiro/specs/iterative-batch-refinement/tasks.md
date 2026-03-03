# Implementation Plan: Iterative Batch Refinement Workflow

## Overview

This implementation plan transforms AssetQL from a single-test-image system into a full CSV-driven batch generation platform with per-image feedback, selective locking, and iterative regeneration capabilities. The plan follows a 12-week roadmap with incremental deliverables, comprehensive testing, and strict phase transitions.

## Tasks

- [-] 1. Phase 1: Foundation - DynamoDB Schema Extensions (Week 1-2)
  - [x] 1.1 Extend AssetQL-assets table schema with iteration fields
    - Add fields: locked (boolean), locked_at_iteration (number), current_iteration (number), iteration_history (array), csv_row_index (number), csv_metadata (object), display_name (string)
    - Set default values for backward compatibility
    - Update table definition in `infra/modules/database/main.tf`
    - _Requirements: 4.1, 4.2, 7.1, 7.2_
  
  - [x] 1.2 Create batchId-locked-index GSI on AssetQL-assets table
    - Partition key: batchId, Sort key: locked
    - Projection: ALL attributes
    - Add GSI definition to Terraform database module
    - _Requirements: 6.1, 6.2_
  
  - [-] 1.3 Extend AssetQL-sessions table schema with iteration tracking
    - Add fields: current_iteration (number), max_iterations (number), master_prompt (string), prompt_history (array)
    - Set defaults: current_iteration=1, max_iterations=3, prompt_history=[]
    - Update table definition in Terraform
    - _Requirements: 7.6, 7.7, 8.1, 5.5, 5.6_
  
  - [-] 1.4 Extend AssetQL-batches table schema with lock tracking
    - Add fields: current_iteration (number), locked_count (number), total_count (number)
    - Set defaults: current_iteration=1, locked_count=0, total_count=totalTasks
    - Update table definition in Terraform
    - _Requirements: 1.6, 10.2_
  
  - [ ] 1.5 Extend AssetQL-feedback table schema with type classification
    - Add fields: type (string: "per_image" or "batch_level"), assetId (string, optional)
    - Create type-sessionId-iterationNumber-index GSI
    - Update table definition in Terraform
    - _Requirements: 3.3, 5.2_

  - [ ] 1.6 Write migration script for existing AssetQL-assets records
    - Create `scripts/migrate-assets-table.js`
    - Add default values for new fields using UpdateCommand
    - Handle batch processing (100 records at a time)
    - Include error handling and rollback capability
    - _Requirements: 4.1, 4.2_
  
  - [ ] 1.7 Write migration script for existing AssetQL-sessions records
    - Create `scripts/migrate-sessions-table.js`
    - Add default iteration fields to existing sessions
    - Preserve existing session data
    - _Requirements: 7.6, 7.7, 8.1_
  
  - [ ] 1.8 Write migration script for existing AssetQL-batches records
    - Create `scripts/migrate-batches-table.js`
    - Add lock tracking fields with defaults
    - Calculate initial locked_count from existing assets
    - _Requirements: 1.6, 10.2_
  
  - [ ] 1.9 Write migration script for existing AssetQL-feedback records
    - Create `scripts/migrate-feedback-table.js`
    - Set type="batch_level" for existing feedback (default)
    - Add assetId=null for batch-level feedback
    - _Requirements: 3.3, 5.2_
  
  - [ ] 1.10 Update shared module with new field definitions
    - Update `shared/index.js` with new DynamoDB field constants
    - Add helper functions for iteration tracking
    - Add validation functions for new fields
    - Export new command classes if needed
    - _Requirements: All schema requirements_
  
  - [ ] 1.11 Deploy schema changes to staging environment
    - Run Terraform apply for database module
    - Wait for GSI creation to complete
    - Verify GSI status is ACTIVE
    - Run migration scripts on staging data
    - _Requirements: All Phase 1 requirements_

- [ ] 2. Checkpoint - Verify schema migration
  - Ensure all migration scripts complete successfully, verify GSI creation, ask the user if questions arise.

- [ ] 3. Phase 2: Core Lambda Functions - Feedback Manager (Week 3)
  - [ ] 3.1 Create Feedback Manager Lambda function structure
    - Create directory `lambdas/feedback-manager/`
    - Create `index.js` with handler routing
    - Import shared utilities from `shared/index.js`
    - Set up environment variables: FEEDBACK_TABLE_NAME, SESSIONS_TABLE_NAME, ASSETS_TABLE_NAME, SQS_QUEUE_URL
    - _Requirements: 3.1, 3.2, 5.1_
  
  - [ ] 3.2 Implement per-image feedback handler
    - Function: handlePerImageFeedback(event)
    - Parse request body: assetId, feedbackText, sessionId, batchId, iterationNumber
    - Generate feedbackId using crypto.randomUUID()
    - Save feedback record with type="per_image"
    - Return 201 Created with feedbackId
    - _Requirements: 3.3, 3.4_
  
  - [ ] 3.3 Implement batch-level feedback handler
    - Function: handleBatchLevelFeedback(event)
    - Parse request body: sessionId, batchId, feedbackText, iterationNumber
    - Save feedback record with type="batch_level"
    - Fetch session to get current master_prompt
    - Invoke PromptEngineerAgent with feedback
    - Update session.master_prompt and append to prompt_history
    - Trigger selective regeneration
    - Return 200 OK with refinedPrompt and regeneration status
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 3.4 Implement PromptEngineerAgent invocation with retry logic
    - Function: invokePromptEngineerAgent(sessionId, currentPrompt, feedback, lockedElements)
    - Use BedrockAgentRuntime.InvokeAgentCommand
    - Implement exponential backoff: 1s, 2s, 4s delays
    - Max 3 retry attempts
    - Parse agent response to extract refined prompt
    - Throw error after all retries fail (preserve current prompt)
    - _Requirements: 5.3, 16.1, 16.2, 20.1, 20.2_
  
  - [ ] 3.5 Implement selective regeneration trigger
    - Function: triggerSelectiveRegeneration(batchId, sessionId, refinedPrompt)
    - Query unlocked assets using batchId-locked-index GSI
    - Fetch batch and session for config
    - Increment session.current_iteration
    - Create regeneration tasks with CSV metadata
    - Apply refined prompt template with CSV variable substitution
    - Push tasks to SQS in batches of 10
    - Update batch status to "regenerating"
    - Return unlocked assets count
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]*  3.6 Write unit tests for Feedback Manager
    - Test per-image feedback submission
    - Test batch-level feedback submission
    - Test agent invocation failure handling
    - Test selective regeneration trigger
    - Test feedback type classification
    - _Requirements: 3.3, 5.2_
  
  - [ ] 3.7 Add Feedback Manager Lambda to Terraform
    - Create Lambda resource in `infra/modules/lambdas/main.tf`
    - Configure environment variables
    - Set memory to 512 MB, timeout to 30 seconds
    - Add IAM permissions: DynamoDB, Bedrock Agent, SQS
    - Add Lambda permission for Bedrock Agent invocation
    - _Requirements: 3.1_

- [ ] 4. Phase 2: Core Lambda Functions - Asset Manager (Week 3)
  - [ ] 4.1 Create Asset Manager Lambda function structure
    - Create directory `lambdas/asset-manager/`
    - Create `index.js` with handler routing
    - Import shared utilities from `shared/index.js`
    - Set up environment variables: ASSETS_TABLE_NAME, BATCHES_TABLE_NAME, SESSIONS_TABLE_NAME
    - _Requirements: 4.3, 4.4, 4.5_
  
  - [ ] 4.2 Implement asset lock operation
    - Function: lockAsset(event)
    - Extract assetId from path parameters
    - Fetch asset and validate status (reject if "regeneration_failed")
    - Fetch batch to get current_iteration
    - Update asset: locked=true, locked_at_iteration=current_iteration
    - Increment batch.locked_count atomically
    - Return 200 OK with lock status
    - Return 400 Bad Request for failed assets
    - _Requirements: 4.3, 4.6, 16.5_
  
  - [ ] 4.3 Implement asset unlock operation
    - Function: unlockAsset(event)
    - Extract assetId from path parameters
    - Fetch asset
    - Update asset: locked=false, locked_at_iteration=null
    - Decrement batch.locked_count atomically (only if was previously locked)
    - Return 200 OK with unlock status
    - _Requirements: 4.4_
  
  - [ ] 4.4 Implement get assets by batch query
    - Function: getAssetsByBatch(event)
    - Extract batchId from path parameters
    - Parse query parameters: locked (boolean filter), iteration (number filter)
    - Query assets using batchId-index GSI
    - Apply filters if provided
    - Calculate locked_count and unlocked_count
    - Return assets array with counts
    - _Requirements: 4.5, 10.1_
  
  - [ ] 4.5 Implement iteration status query
    - Function: getIterationStatus(event)
    - Extract sessionId from path parameters
    - Fetch session and batch
    - Calculate: allLocked, maxIterationsReached, lockedPercentage
    - Determine can_transition_to_batch_review eligibility
    - Generate status message
    - Return iteration status with transition criteria
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 9.1, 9.2_

  - [ ]* 4.6 Write unit tests for Asset Manager
    - Test lock operation on valid asset
    - Test lock rejection on failed asset
    - Test unlock operation
    - Test get assets with filters
    - Test iteration status calculation
    - Test transition eligibility logic
    - _Requirements: 4.3, 4.4, 4.5, 16.5_
  
  - [ ] 4.7 Add Asset Manager Lambda to Terraform
    - Create Lambda resource in `infra/modules/lambdas/main.tf`
    - Configure environment variables
    - Set memory to 256 MB, timeout to 10 seconds
    - Add IAM permissions: DynamoDB read/write
    - _Requirements: 4.3_

- [ ] 5. Phase 2: Core Lambda Functions - Extend Image Generator (Week 4)
  - [ ] 5.1 Extend Image Generator to handle regeneration messages
    - Update message parsing to include: assetId, iteration, isRegeneration, csv_metadata
    - Add conditional logic: if isRegeneration, fetch existing asset
    - Preserve iteration_history when regenerating
    - _Requirements: 6.3, 7.3, 7.4_
  
  - [ ] 5.2 Implement iteration history tracking
    - When regenerating, append current s3Key to iteration_history array
    - Update current_iteration to new iteration number
    - Update s3Key to new image location
    - Preserve csv_metadata, csv_row_index, display_name (immutable)
    - _Requirements: 7.2, 7.3, 7.4, 2.4, 2.5_
  
  - [ ] 5.3 Implement initial asset creation with CSV metadata
    - Extract display_name from csv_metadata (name, item, or product column)
    - Default to assetId if no display name found
    - Store csv_row_index and csv_metadata
    - Initialize: locked=false, current_iteration=1, iteration_history=[]
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 5.4 Update batch status to "ready_for_feedback" when complete
    - Check if batch.completedTasks === batch.totalTasks
    - Update batch.status to "ready_for_feedback"
    - Handle both initial generation and regeneration completion
    - _Requirements: 1.6, 10.2_
  
  - [ ] 5.5 Implement regeneration failure handling
    - Mark asset status as "regeneration_failed" on error
    - Increment batch.failedTasks counter
    - Do not block other assets from processing
    - Store error_message in asset record
    - _Requirements: 16.3, 16.4, 16.5_
  
  - [ ]* 5.6 Write unit tests for extended Image Generator
    - Test initial asset creation with CSV metadata
    - Test regeneration with iteration history
    - Test CSV metadata preservation across iterations
    - Test batch status updates
    - Test regeneration failure handling
    - _Requirements: 2.4, 2.5, 6.3, 7.3, 7.4_

- [ ] 6. Phase 2: Core Lambda Functions - Extend Batch Creator (Week 4)
  - [ ] 6.1 Extend Batch Creator to require sessionId
    - Add sessionId validation (return 400 if missing)
    - Link batch to session via sessionId
    - _Requirements: 1.1, 1.2_
  
  - [ ] 6.2 Implement full CSV batch processing (remove 10% subset logic)
    - Process ALL csvRows when phase="full"
    - Remove test subset logic
    - Set totalTasks = csvRows.length
    - _Requirements: 1.3, 1.4, 2.1_
  
  - [ ] 6.3 Initialize batch with iteration tracking fields
    - Set current_iteration=1
    - Set locked_count=0
    - Set total_count=totalTasks
    - _Requirements: 1.6, 7.6, 10.2_
  
  - [ ] 6.4 Update session with batchId and master_prompt
    - Link session to batch via batchId
    - Store template as master_prompt in session
    - Initialize current_iteration=1 in session
    - _Requirements: 1.2, 5.5, 8.1_
  
  - [ ] 6.5 Include CSV metadata in SQS messages
    - Add csv_row_index to each task message
    - Add csv_metadata object to each task message
    - Set iteration=1 and isRegeneration=false for initial generation
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [ ]* 6.6 Write unit tests for extended Batch Creator
    - Test sessionId requirement validation
    - Test full CSV processing (no subset)
    - Test iteration field initialization
    - Test session linking
    - Test CSV metadata in SQS messages
    - _Requirements: 1.1, 1.2, 1.3, 2.3_

- [ ] 7. Phase 2: Core Lambda Functions - Extend Session Manager (Week 4)
  - [ ] 7.1 Extend session creation with iteration fields
    - Initialize current_iteration=1
    - Initialize max_iterations=3 (default)
    - Initialize prompt_history=[]
    - Initialize master_prompt="" (empty until batch created)
    - _Requirements: 7.6, 7.7, 8.1, 5.5_
  
  - [ ] 7.2 Implement phase transition validation for SINGLE_ITERATION → BATCH_REVIEW
    - Fetch batch to check transition criteria
    - Calculate: allLocked, maxIterationsReached, lockedPercentage
    - Allow transition if allLocked OR maxIterationsReached OR forceTransition=true
    - Return 409 Conflict if criteria not met
    - Include transition_criteria in error response
    - Warn if lockedPercentage < 80% on forced transition
    - _Requirements: 8.6, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 7.3 Preserve existing phase transition logic for other phases
    - Keep LEGAL_TRANSITIONS map for all phase pairs
    - Validate legal transitions as before
    - Only add special validation for SINGLE_ITERATION → BATCH_REVIEW
    - _Requirements: 8.6, 8.7_
  
  - [ ]* 7.4 Write unit tests for extended Session Manager
    - Test session creation with iteration fields
    - Test transition with all assets locked (should allow)
    - Test transition with max iterations reached (should allow)
    - Test transition with forceTransition=true and 80%+ locked (should allow with warning)
    - Test transition with forceTransition=true and <80% locked (should allow with strong warning)
    - Test transition rejection when criteria not met
    - _Requirements: 8.6, 8.7, 9.1, 9.2, 9.4, 9.5_

- [ ] 8. Checkpoint - Verify core Lambda functions
  - Ensure all Lambda functions are implemented, unit tests pass, ask the user if questions arise.

- [ ] 9. Phase 3: API Gateway Integration (Week 5)
  - [ ] 9.1 Create API Gateway routes for Feedback Manager
    - POST /api/v1/feedback/per-image
    - POST /api/v1/feedback/batch-level
    - Configure Cognito authorization
    - Set request/response models
    - _Requirements: 3.1, 5.1_
  
  - [ ] 9.2 Create API Gateway routes for Asset Manager
    - POST /api/v1/assets/{assetId}/lock
    - POST /api/v1/assets/{assetId}/unlock
    - GET /api/v1/batches/{batchId}/assets
    - GET /api/v1/sessions/{sessionId}/iteration-status
    - POST /api/v1/batches/{batchId}/regenerate
    - Configure Cognito authorization
    - Set request/response models
    - _Requirements: 4.3, 4.4, 4.5, 8.2, 6.1_
  
  - [ ] 9.3 Configure throttling and rate limiting
    - Set rate limit: 100 req/sec
    - Set burst limit: 200 req/sec
    - Set quota: 10,000 req/day (default tier)
    - Configure per-endpoint throttling for regeneration endpoint
    - _Requirements: Performance targets_
  
  - [ ] 9.4 Update API Gateway Terraform configuration
    - Add new routes to `infra/modules/api/main.tf`
    - Link routes to Lambda functions
    - Configure CORS headers
    - Set up CloudWatch logging
    - _Requirements: All API requirements_
  
  - [ ]* 9.5 Create Postman collection for new endpoints
    - Add requests for all new endpoints
    - Include example payloads
    - Add authentication setup
    - Document expected responses
    - _Requirements: Testing and documentation_
  
  - [ ]* 9.6 Write integration tests for API endpoints
    - Test per-image feedback submission
    - Test batch-level feedback with agent invocation
    - Test asset lock/unlock operations
    - Test iteration status query
    - Test selective regeneration trigger
    - Test authentication and authorization
    - _Requirements: All API requirements_

- [ ] 10. Phase 4: Property-Based Testing (Week 6)
  - [ ] 10.1 Install and configure fast-check library
    - Run: pnpm add -D fast-check
    - Create test directory: `tests/property-based/`
    - Configure test runner (Mocha or Jest)
    - Set numRuns: 100 for all property tests
    - _Requirements: Testing strategy_
  
  - [ ]* 10.2 Write property test for CSV Metadata Preservation (Property 1)
    - **Property 1: CSV Metadata Preservation Across Iterations**
    - **Validates: Requirements 2.4, 2.5, 6.5**
    - Generate random csv_metadata, csv_row_index, display_name
    - Create asset and perform multiple regenerations
    - Assert CSV metadata unchanged after all regenerations
    - _Requirements: 2.4, 2.5, 6.5_

  - [ ]* 10.3 Write property test for Locked Asset Immutability (Property 2)
    - **Property 2: Locked Asset Immutability**
    - **Validates: Requirements 6.6, 6.7**
    - Generate batch with mixed locked/unlocked assets
    - Record locked asset s3Keys before regeneration
    - Trigger selective regeneration
    - Assert locked assets' s3Keys unchanged
    - _Requirements: 6.6, 6.7_
  
  - [ ]* 10.4 Write property test for Iteration Increment (Property 3)
    - **Property 3: Iteration Increment on Regeneration**
    - **Validates: Requirements 6.3, 7.3, 7.4, 8.4**
    - Generate asset and perform regeneration
    - Assert current_iteration increments by exactly 1
    - Assert previous s3Key appended to iteration_history
    - _Requirements: 6.3, 7.3, 7.4, 8.4_
  
  - [ ]* 10.5 Write property test for Asset Schema Compliance (Property 4)
    - **Property 4: Asset Schema Compliance**
    - **Validates: Requirements 4.1, 4.2, 7.1, 7.2**
    - Generate random asset data
    - Create asset record
    - Assert all required fields present with correct types
    - _Requirements: 4.1, 4.2, 7.1, 7.2_
  
  - [ ]* 10.6 Write property test for Selective Regeneration Correctness (Property 5)
    - **Property 5: Selective Regeneration Correctness**
    - **Validates: Requirements 6.1, 6.2**
    - Generate batch with random locked/unlocked distribution
    - Trigger selective regeneration
    - Assert regeneration count equals unlocked count
    - Assert no locked assets queued for regeneration
    - Assert all unlocked assets queued for regeneration
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 10.7 Write property test for Feedback Type Classification (Property 6)
    - **Property 6: Feedback Type Classification**
    - **Validates: Requirements 3.3, 5.2**
    - Generate feedback with and without assetId
    - Assert type="per_image" when assetId provided
    - Assert type="batch_level" when assetId absent
    - _Requirements: 3.3, 5.2_
  
  - [ ]* 10.8 Write property test for Phase Transition Eligibility (Property 7)
    - **Property 7: Phase Transition Eligibility**
    - **Validates: Requirements 8.6, 8.7, 9.1, 9.2, 9.6**
    - Generate sessions with various lock percentages and iteration counts
    - Test transition eligibility logic
    - Assert allowed when all locked OR max iterations OR forceTransition
    - Assert rejected otherwise
    - _Requirements: 8.6, 8.7, 9.1, 9.2, 9.6_
  
  - [ ]* 10.9 Write property test for Iteration Bounds (Property 8)
    - **Property 8: Iteration Bounds**
    - **Validates: Requirements 7.6, 7.7, 8.1**
    - Generate sessions with random iteration values
    - Assert 1 <= current_iteration <= max_iterations always holds
    - _Requirements: 7.6, 7.7, 8.1_
  
  - [ ]* 10.10 Write property test for Batch Progress Consistency (Property 9)
    - **Property 9: Batch Progress Consistency**
    - **Validates: Requirements 1.6, 10.2**
    - Generate batches with random progress values
    - Assert completedTasks + failedTasks <= totalTasks
    - Assert locked_count <= total_count
    - _Requirements: 1.6, 10.2_
  
  - [ ]* 10.11 Write property test for Prompt History Monotonicity (Property 10)
    - **Property 10: Prompt History Monotonicity**
    - **Validates: Requirements 5.5, 5.6**
    - Generate sessions with multiple prompt refinements
    - Assert prompt_history is append-only
    - Assert iteration numbers in ascending order
    - Assert no duplicate iteration numbers
    - _Requirements: 5.5, 5.6_
  
  - [ ]* 10.12 Write property test for Locked Status Persistence (Property 11)
    - **Property 11: Locked Status Persistence Across Phases**
    - **Validates: Requirements 4.6**
    - Generate assets locked in various phases
    - Simulate phase transitions
    - Assert locked status persists unless explicitly unlocked
    - _Requirements: 4.6_
  
  - [ ]* 10.13 Write property test for Failed Asset Lock Prevention (Property 12)
    - **Property 12: Failed Asset Lock Prevention**
    - **Validates: Requirements 16.5**
    - Generate assets with status="regeneration_failed"
    - Attempt lock operation
    - Assert operation rejected with 400 error
    - _Requirements: 16.5_
  
  - [ ]* 10.14 Write property test for Prompt Refinement Retry Idempotence (Property 13)
    - **Property 13: Prompt Refinement Retry Idempotence**
    - **Validates: Requirements 16.1, 16.2**
    - Simulate agent failures
    - Assert master_prompt unchanged after all retries fail
    - _Requirements: 16.1, 16.2_

  - [ ]* 10.15 Write property test for Locked Element Preservation (Property 14)
    - **Property 14: Locked Element Preservation (Round-Trip Property)**
    - **Validates: Requirements 20.1, 20.2, 20.3, 20.5**
    - Generate random prompts and locked elements
    - Refine prompt with agent
    - Parse refined prompt to extract elements
    - Assert all locked elements preserved (round-trip)
    - _Requirements: 20.1, 20.2, 20.3, 20.5_
  
  - [ ]* 10.16 Write property test for Display Name Extraction (Property 15)
    - **Property 15: Display Name Extraction**
    - **Validates: Requirements 2.2**
    - Generate CSV data with various column names
    - Create assets from CSV
    - Assert display_name extracted from name/item/product column
    - Assert display_name defaults to assetId if columns missing
    - _Requirements: 2.2_
  
  - [ ]* 10.17 Write property test for Batch Status Transitions (Property 16)
    - **Property 16: Batch Status Transitions**
    - **Validates: Requirements 1.6**
    - Generate batches and simulate status changes
    - Assert status follows sequence: queued → generating → ready_for_feedback → regenerating → completed
    - Assert no backward transitions
    - _Requirements: 1.6_
  
  - [ ]* 10.18 Write property test for Regeneration Task Count (Property 17)
    - **Property 17: Regeneration Task Count Equals Unlocked Count**
    - **Validates: Requirements 6.2**
    - Generate batches with random lock distributions
    - Trigger selective regeneration
    - Assert SQS task count equals unlocked asset count
    - _Requirements: 6.2_
  
  - [ ]* 10.19 Write property test for Iteration History Ordering (Property 18)
    - **Property 18: Iteration History Ordering**
    - **Validates: Requirements 7.2, 7.3**
    - Generate assets with multiple regenerations
    - Assert iteration_history ordered by iteration number ascending
    - Assert no duplicate iteration numbers in history
    - _Requirements: 7.2, 7.3_
  
  - [ ]* 10.20 Write property test for Feedback Timestamp Monotonicity (Property 19)
    - **Property 19: Feedback Timestamp Monotonicity**
    - **Validates: Requirements 3.2, 5.2**
    - Generate feedback records across iterations
    - Sort by iterationNumber
    - Assert timestamps non-decreasing across iterations
    - _Requirements: 3.2, 5.2_
  
  - [ ]* 10.21 Write property test for Transition Warning Threshold (Property 20)
    - **Property 20: Transition Warning Threshold**
    - **Validates: Requirements 9.4, 9.5**
    - Generate sessions with locked_percentage < 80%
    - Attempt forced transition
    - Assert warning included in response
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 10.22 Integrate property tests into CI/CD pipeline
    - Add property test script to package.json
    - Configure CI to run property tests on every PR
    - Set coverage thresholds
    - Fail build if property tests fail
    - _Requirements: Testing strategy_

- [ ] 11. Checkpoint - Verify property-based testing
  - Ensure all 20 property tests pass with 100 iterations, review any shrinking failures, ask the user if questions arise.

- [ ] 12. Phase 5: Frontend Integration - Asset Grid Component (Week 7)
  - [ ] 12.1 Create AssetGrid component with CSV metadata display
    - Display assets in responsive grid layout
    - Show asset image, display_name, and key CSV metadata
    - Show current_iteration and locked status
    - Use Recharts for any visualization needs
    - _Requirements: 2.2, 4.1, 7.1, 10.1_
  
  - [ ] 12.2 Implement lock/unlock toggle on asset cards
    - Add lock icon button to each asset card
    - Call POST /api/v1/assets/{assetId}/lock on click
    - Call POST /api/v1/assets/{assetId}/unlock on unlock
    - Update UI state immediately (optimistic update)
    - Show error toast if operation fails (e.g., failed asset)
    - _Requirements: 4.3, 4.4, 16.5_
  
  - [ ] 12.3 Display iteration history for each asset
    - Add expandable section showing iteration_history
    - Display previous s3Keys as thumbnail gallery
    - Show iteration number for each historical image
    - Allow comparison between current and previous iterations
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [ ] 12.4 Show asset status indicators
    - Display status badge: completed, regenerating, regeneration_failed
    - Show error_message for failed assets
    - Provide retry button for failed assets
    - Disable lock button for failed assets
    - _Requirements: 16.3, 16.4, 16.5_

  - [ ]* 12.5 Write frontend tests for AssetGrid component
    - Test asset rendering with CSV metadata
    - Test lock/unlock toggle functionality
    - Test iteration history display
    - Test status indicators
    - Test error handling
    - _Requirements: 2.2, 4.3, 4.4, 7.2_

- [ ] 13. Phase 5: Frontend Integration - Feedback Components (Week 7)
  - [ ] 13.1 Create PerImageFeedbackModal component
    - Modal dialog triggered from asset card
    - Text area for feedback input (max 5000 chars)
    - Submit button calls POST /api/v1/feedback/per-image
    - Show loading state during submission
    - Close modal on success
    - _Requirements: 3.3, 3.4_
  
  - [ ] 13.2 Create BatchLevelFeedbackForm component
    - Form at batch level (above asset grid)
    - Text area for batch-level feedback
    - Submit button calls POST /api/v1/feedback/batch-level
    - Show loading state during agent invocation
    - Display refined prompt after submission
    - Show regeneration progress indicator
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 13.3 Display prompt refinement results
    - Show refined prompt in read-only text area
    - Highlight changes from previous prompt (diff view)
    - Show locked style elements preserved
    - Display regeneration status and unlocked asset count
    - _Requirements: 5.4, 5.5, 20.1, 20.2_
  
  - [ ] 13.4 Handle feedback submission errors
    - Show error toast if agent invocation fails
    - Display current master prompt preserved message
    - Provide retry button
    - Log errors for debugging
    - _Requirements: 16.1, 16.2_
  
  - [ ]* 13.5 Write frontend tests for feedback components
    - Test per-image feedback modal
    - Test batch-level feedback form
    - Test prompt refinement display
    - Test error handling
    - _Requirements: 3.3, 5.1, 16.1_

- [ ] 14. Phase 5: Frontend Integration - Iteration Status Display (Week 8)
  - [ ] 14.1 Create IterationStatusIndicator component
    - Fetch status from GET /api/v1/sessions/{sessionId}/iteration-status
    - Display: current_iteration / max_iterations
    - Display: locked_count / total_count with percentage
    - Show progress bar for lock percentage
    - Display status message
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 14.2 Display transition eligibility criteria
    - Show checkboxes for: all_locked, max_iterations_reached
    - Highlight which criteria are met
    - Show can_transition_to_batch_review status
    - Display warning if locked_percentage < 80%
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 14.3 Implement phase transition button
    - Button enabled only when can_transition_to_batch_review=true
    - Call PUT /api/v1/sessions/{sessionId}/phase with newPhase="BATCH_REVIEW"
    - Show confirmation dialog if locked_percentage < 80%
    - Allow forceTransition=true override with warning
    - Handle 409 Conflict response with clear error message
    - _Requirements: 8.6, 8.7, 9.6_
  
  - [ ] 14.4 Add real-time progress updates
    - Poll iteration status every 5 seconds during regeneration
    - Update locked_count and progress bar in real-time
    - Show notification when regeneration completes
    - Stop polling when batch status is "ready_for_feedback"
    - _Requirements: 10.2, 10.3_
  
  - [ ]* 14.5 Write frontend tests for iteration status components
    - Test status indicator rendering
    - Test transition eligibility display
    - Test phase transition button
    - Test real-time updates
    - Test error handling
    - _Requirements: 8.2, 8.6, 9.1_

- [ ] 15. Phase 5: Frontend Integration - Regeneration Controls (Week 8)
  - [ ] 15.1 Create RegenerationButton component
    - Button to manually trigger regeneration
    - Call POST /api/v1/batches/{batchId}/regenerate
    - Show confirmation dialog with unlocked asset count
    - Display estimated completion time
    - Disable during active regeneration
    - _Requirements: 6.1, 6.4_
  
  - [ ] 15.2 Display regeneration progress
    - Show progress indicator during regeneration
    - Display: X of Y assets regenerated
    - Show estimated time remaining
    - List assets currently being regenerated
    - _Requirements: 10.2, 10.3_
  
  - [ ] 15.3 Handle regeneration errors
    - Show error toast if queue at capacity (429 response)
    - Display retry_after time
    - Provide retry button after cooldown
    - Show partial failure notifications
    - _Requirements: 16.6, 16.7_

  - [ ]* 15.4 Write frontend tests for regeneration controls
    - Test regeneration button
    - Test progress display
    - Test error handling
    - Test throttling behavior
    - _Requirements: 6.1, 16.6_

- [ ] 16. Checkpoint - Verify frontend integration
  - Ensure all UI components functional, test user workflows end-to-end, ask the user if questions arise.

- [ ] 17. Phase 6: Performance Testing and Optimization (Week 9)
  - [ ] 17.1 Set up load testing environment
    - Install load testing tool (Artillery or k6)
    - Create test scenarios for all 4 load test cases
    - Configure test data generators
    - Set up monitoring during tests
    - _Requirements: Performance targets_
  
  - [ ] 17.2 Run load test scenario 1: Single large batch
    - Test: 500 assets, 3 iterations
    - Expected: 1500 total generations in < 90 minutes
    - Measure: throughput, error rate, latency
    - Success rate target: > 95%
    - _Requirements: Performance targets_
  
  - [ ] 17.3 Run load test scenario 2: Concurrent batches
    - Test: 10 batches of 100 assets each, concurrent
    - Expected: No throttling, no queue overflow
    - Duration target: < 30 minutes per batch
    - Measure: queue depth, Lambda concurrency, DynamoDB throttling
    - _Requirements: Performance targets_
  
  - [ ] 17.4 Run load test scenario 3: High feedback volume
    - Test: 100 users submitting feedback simultaneously
    - Expected: < 5 second response time
    - No agent invocation failures
    - Measure: API Gateway throttling, agent latency
    - _Requirements: Performance targets_
  
  - [ ] 17.5 Run load test scenario 4: Phase transition storm
    - Test: 50 sessions transitioning to BATCH_REVIEW simultaneously
    - Expected: All transitions validated correctly
    - No race conditions on batch counters
    - Measure: DynamoDB consistency, error rate
    - _Requirements: Performance targets_
  
  - [ ] 17.6 Identify bottlenecks with X-Ray tracing
    - Enable X-Ray on all Lambda functions
    - Analyze trace segments for slow operations
    - Identify DynamoDB hot partitions
    - Find slow Bedrock invocations
    - Document bottlenecks and root causes
    - _Requirements: Performance optimization_
  
  - [ ] 17.7 Optimize slow queries and operations
    - Add caching for session and batch metadata
    - Optimize DynamoDB query patterns
    - Implement parallel processing where possible
    - Reduce Lambda cold starts with provisioned concurrency
    - _Requirements: Performance optimization_
  
  - [ ] 17.8 Create CloudWatch dashboards
    - Dashboard 1: Iteration workflow metrics (lock rate, iteration count)
    - Dashboard 2: Performance metrics (latency, throughput)
    - Dashboard 3: Error metrics (failure rates, retry counts)
    - Dashboard 4: Cost metrics (generation cost, savings from selective regen)
    - _Requirements: Monitoring and observability_
  
  - [ ] 17.9 Set up CloudWatch alarms
    - Alarm: PromptRefinementFailureRate > 10% over 5 minutes
    - Alarm: RegenerationFailureRate > 15% over 10 minutes
    - Alarm: QueueCapacityUtilization > 80% over 5 minutes
    - Alarm: API Gateway 5xx errors > 5% over 5 minutes
    - Configure SNS notifications for alarms
    - _Requirements: Monitoring and observability_
  
  - [ ] 17.10 Document performance characteristics
    - Create performance report with test results
    - Document optimization changes and impact
    - Provide capacity planning recommendations
    - Document scaling limits and thresholds
    - _Requirements: Performance documentation_

- [ ] 18. Phase 7: Beta Release (Week 10)
  - [ ] 18.1 Implement feature flags for gradual rollout
    - Add feature flags: iterative_refinement_enabled, selective_regeneration_enabled, per_image_feedback_enabled
    - Implement user-based rollout (hash userId for percentage)
    - Configure rollout percentage in environment variables
    - _Requirements: Migration and rollback_
  
  - [ ] 18.2 Enable beta release for 10% of users
    - Set rollout percentage to 10%
    - Deploy to production with feature flags
    - Monitor error rates and performance
    - Set up user feedback collection mechanism
    - _Requirements: Beta release_

  - [ ] 18.3 Monitor beta release metrics
    - Track error rates (target: < 1%)
    - Monitor performance vs. targets
    - Collect user feedback via in-app surveys
    - Track feature adoption rate
    - Monitor cost per asset
    - _Requirements: Beta release_
  
  - [ ] 18.4 Fix critical bugs identified in beta
    - Prioritize bugs by severity and frequency
    - Deploy hotfixes as needed
    - Update documentation with known issues
    - Communicate fixes to beta users
    - _Requirements: Beta release_
  
  - [ ] 18.5 Iterate on UX based on beta feedback
    - Analyze user feedback for UX issues
    - Identify confusing workflows or UI elements
    - Make UX improvements
    - A/B test changes if needed
    - _Requirements: Beta release_
  
  - [ ] 18.6 Prepare for full rollout
    - Verify all critical bugs fixed
    - Confirm performance targets met
    - Review security and compliance
    - Prepare rollout communication
    - _Requirements: Beta release_

- [ ] 19. Phase 8: Full Rollout - Gradual Expansion (Week 11)
  - [ ] 19.1 Expand rollout to 50% of users
    - Increase rollout percentage to 50%
    - Deploy configuration change
    - Monitor metrics for 48 hours
    - Verify no degradation in performance or error rates
    - _Requirements: Full rollout_
  
  - [ ] 19.2 Monitor 50% rollout metrics
    - Track error rates, performance, cost
    - Monitor user adoption and engagement
    - Collect additional feedback
    - Identify any issues at scale
    - _Requirements: Full rollout_
  
  - [ ] 19.3 Expand rollout to 100% of users
    - Increase rollout percentage to 100%
    - Deploy configuration change
    - Monitor metrics for 72 hours
    - Verify stable operation at full scale
    - _Requirements: Full rollout_
  
  - [ ] 19.4 Monitor full rollout metrics
    - Track all key metrics at 100% rollout
    - Verify cost optimization targets met (40-60% savings)
    - Monitor user satisfaction scores
    - Track feature adoption rate (target: > 50% within 2 weeks)
    - _Requirements: Full rollout_

- [ ] 20. Phase 8: Full Rollout - Documentation and Training (Week 11-12)
  - [ ] 20.1 Write user documentation
    - Document iterative refinement workflow
    - Explain per-image vs. batch-level feedback
    - Document lock/unlock functionality
    - Explain iteration limits and phase transitions
    - Provide best practices for cost optimization
    - _Requirements: User documentation_
  
  - [ ] 20.2 Create video tutorials
    - Tutorial 1: Overview of iterative refinement workflow
    - Tutorial 2: Using per-image feedback and locking
    - Tutorial 3: Batch-level feedback and prompt refinement
    - Tutorial 4: Understanding iteration status and phase transitions
    - Tutorial 5: Cost optimization tips
    - _Requirements: User documentation_
  
  - [ ] 20.3 Update API documentation
    - Document all new API endpoints
    - Provide request/response examples
    - Document error codes and handling
    - Update OpenAPI/Swagger spec
    - _Requirements: API documentation_
  
  - [ ] 20.4 Create internal training materials
    - Training deck for customer support team
    - FAQ document for common issues
    - Troubleshooting guide
    - Escalation procedures
    - _Requirements: Training materials_
  
  - [ ] 20.5 Announce feature to all users
    - Write announcement blog post
    - Send email to all users
    - Post on social media
    - Update product website
    - _Requirements: Feature announcement_
  
  - [ ] 20.6 Provide customer support
    - Monitor support tickets related to new feature
    - Respond to user questions promptly
    - Collect feedback for future improvements
    - Update FAQ based on common questions
    - _Requirements: Customer support_

- [ ] 21. Final Checkpoint - Verify full rollout
  - Ensure 100% rollout complete, documentation published, user adoption tracking, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (20 properties total)
- Unit tests validate specific examples and edge cases
- Implementation follows 12-week roadmap from design document
- All Lambda functions use JavaScript/Node.js with AWS SDK v3
- Feature uses Amazon Nova Micro (PromptEngineerAgent), Nova Lite (style scoring), and Stable Image Core (generation)
- Cost optimization through selective regeneration (40-60% savings target)
- Performance targets: < 200ms API response, < 20 minutes for 100 asset batch
- Gradual rollout: 10% → 50% → 100% with monitoring at each stage
