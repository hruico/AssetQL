# Requirements Document: Iterative Batch Refinement Workflow

## Introduction

The Iterative Batch Refinement Workflow transforms the current single-test-image approach into a full CSV-driven batch generation system with per-image feedback, selective locking, and iterative regeneration. This feature enables users to refine entire batches through multiple iterations, approving individual images while regenerating only the unsatisfactory ones, until the complete batch meets quality standards.

## Glossary

- **Batch**: A collection of image generation tasks created from CSV input
- **Asset**: A generated image with associated metadata and CSV row data
- **Iteration**: A single generation cycle within the refinement workflow
- **Lock_Status**: Boolean flag indicating whether an asset is approved and should not be regenerated
- **CSV_Metadata**: Data from the CSV row associated with an asset (item name, properties)
- **Master_Prompt**: The base prompt template used for all assets in a batch
- **Per_Image_Feedback**: User feedback specific to an individual asset
- **Batch_Feedback**: User feedback applied to the entire batch for master prompt refinement
- **PromptEngineerAgent**: Bedrock Agent that refines prompts based on feedback
- **Selective_Regeneration**: Process of regenerating only unlocked assets
- **Session**: User workflow instance tracking progress through phases
- **SINGLE_ITERATION_Phase**: Session phase where iterative refinement occurs
- **BATCH_REVIEW_Phase**: Session phase where final locked images are reviewed
- **Generation_Queue**: SQS queue for image generation tasks
- **Image_Generator_Lambda**: Lambda function that generates images from prompts

## Requirements

### Requirement 1: CSV-Driven Full Batch Generation

**User Story:** As a creative team member, I want to generate images for all items in my CSV file during the Single Iteration phase, so that I can review and refine the complete batch instead of extrapolating from a single test image.

#### Acceptance Criteria

1. WHEN a session transitions to SINGLE_ITERATION phase, THE Batch_Creator SHALL generate tasks for all CSV rows
2. WHEN batch creation completes, THE Batch_Creator SHALL push all tasks to the Generation_Queue
3. THE Image_Generator_Lambda SHALL process all tasks and generate images for each CSV row
4. WHEN an image is generated, THE System SHALL associate the asset with its corresponding CSV row metadata
5. THE System SHALL track the iteration number for each generated asset (starting at 1)
6. WHEN all images in iteration 1 are generated, THE System SHALL update the batch status to "ready_for_feedback"

### Requirement 2: CSV Metadata Association

**User Story:** As a user reviewing generated images, I want to see which CSV row each image corresponds to, so that I can verify the correct item properties were used.

#### Acceptance Criteria

1. THE Asset_Record SHALL store the CSV row index and all CSV column values
2. THE Asset_Record SHALL include a display_name field extracted from the CSV "name" or "item" column
3. WHEN displaying an asset, THE UI SHALL show the CSV metadata (item name, key properties)
4. THE System SHALL preserve CSV metadata across all iterations for the same asset
5. WHEN an asset is regenerated, THE System SHALL maintain the link to the original CSV row

### Requirement 3: Per-Image Feedback Mechanism

**User Story:** As a user refining my batch, I want to provide specific feedback on individual images, so that the system can improve those particular assets without affecting approved ones.

#### Acceptance Criteria

1. THE Feedback_API SHALL accept per-image feedback with assetId, feedbackText, and iterationNumber
2. THE Feedback_Record SHALL store assetId, sessionId, batchId, iterationNumber, feedbackText, and timestamp
3. WHEN per-image feedback is submitted, THE System SHALL save it to the AssetQL-feedback table with type "per_image"
4. THE System SHALL allow multiple feedback entries for the same asset across different iterations
5. WHEN PromptEngineerAgent is invoked, THE System SHALL provide per-image feedback for unlocked assets

### Requirement 4: Image Locking and Approval

**User Story:** As a user reviewing generated images, I want to lock/approve images I'm satisfied with, so that they won't be regenerated in subsequent iterations.

#### Acceptance Criteria

1. THE Asset_Record SHALL include a locked boolean field (default: false)
2. THE Asset_Record SHALL include a locked_at_iteration integer field
3. THE Lock_API SHALL accept assetId and set locked to true
4. WHEN an asset is locked, THE System SHALL record the current iteration number in locked_at_iteration
5. THE Unlock_API SHALL accept assetId and set locked to false
6. THE System SHALL preserve locked status across session phases
7. WHEN displaying assets, THE UI SHALL show a visual indicator for locked assets

### Requirement 5: Batch-Level Feedback for Master Prompt Refinement

**User Story:** As a user refining my batch, I want to provide batch-level feedback to improve the master prompt, so that all future regenerations benefit from the refinement.

#### Acceptance Criteria

1. THE Feedback_API SHALL accept batch-level feedback with sessionId, batchId, feedbackText, and iterationNumber
2. THE Feedback_Record SHALL store sessionId, batchId, iterationNumber, feedbackText, and timestamp with type "batch_level"
3. WHEN batch-level feedback is submitted, THE PromptEngineerAgent SHALL refine the master prompt
4. THE Session_Record SHALL store the current master_prompt and prompt_history array
5. WHEN the master prompt is refined, THE System SHALL append the new prompt to prompt_history with iteration number
6. THE System SHALL use the latest master prompt for all subsequent regenerations

### Requirement 6: Selective Regeneration Logic

**User Story:** As a user iterating on my batch, I want only unlocked images to be regenerated, so that I don't lose approved images and waste generation costs.

#### Acceptance Criteria

1. WHEN batch-level feedback is submitted, THE System SHALL identify all unlocked assets in the current batch
2. THE Regeneration_Service SHALL create tasks only for unlocked assets
3. THE Regeneration_Service SHALL increment the iteration number for regenerated assets
4. THE Regeneration_Service SHALL use the refined master prompt for regeneration tasks
5. THE Regeneration_Service SHALL preserve the CSV metadata association for regenerated assets
6. WHEN regeneration completes, THE System SHALL update only the unlocked asset records with new image URLs
7. THE System SHALL preserve the original image URLs for locked assets

### Requirement 7: Iteration Tracking and History

**User Story:** As a user managing multiple refinement cycles, I want to track which iteration each image is from, so that I can understand the refinement progression.

#### Acceptance Criteria

1. THE Asset_Record SHALL include a current_iteration integer field
2. THE Asset_Record SHALL include an iteration_history array storing previous image URLs and iteration numbers
3. WHEN an asset is regenerated, THE System SHALL append the previous image URL to iteration_history
4. THE System SHALL update current_iteration to the new iteration number
5. THE Batch_Record SHALL track the current_iteration number for the entire batch
6. THE Session_Record SHALL track max_iterations (default: 3)
7. WHEN current_iteration reaches max_iterations, THE System SHALL disable further regeneration

### Requirement 8: Iteration Workflow Orchestration

**User Story:** As a user in the Single Iteration phase, I want to cycle through feedback → refinement → regeneration multiple times, so that I can achieve the desired quality for all images.

#### Acceptance Criteria

1. WHEN a session enters SINGLE_ITERATION phase, THE System SHALL initialize current_iteration to 1
2. WHEN batch-level feedback is submitted, THE System SHALL invoke PromptEngineerAgent to refine the master prompt
3. WHEN prompt refinement completes, THE System SHALL trigger selective regeneration for unlocked assets
4. WHEN regeneration completes, THE System SHALL increment current_iteration
5. THE System SHALL allow iteration cycles until current_iteration reaches max_iterations OR all assets are locked
6. WHEN all assets are locked OR max_iterations is reached, THE System SHALL enable transition to BATCH_REVIEW phase
7. THE System SHALL prevent transition to BATCH_REVIEW if unlocked assets exist and iterations remain

### Requirement 9: Transition Criteria to Batch Review

**User Story:** As a user completing the iterative refinement, I want clear criteria for when I can move to Batch Review, so that I know when the refinement phase is complete.

#### Acceptance Criteria

1. THE System SHALL allow transition to BATCH_REVIEW when all assets in the batch are locked
2. THE System SHALL allow transition to BATCH_REVIEW when current_iteration equals max_iterations
3. THE System SHALL allow manual transition to BATCH_REVIEW if the user explicitly requests it
4. WHEN transitioning to BATCH_REVIEW, THE System SHALL validate that at least 80% of assets are locked
5. IF less than 80% of assets are locked, THE System SHALL display a warning but allow transition
6. THE Session_Manager_Lambda SHALL enforce legal phase transitions (SINGLE_ITERATION → BATCH_REVIEW)

### Requirement 10: Batch Review Phase Behavior

**User Story:** As a user in Batch Review phase, I want to review all final locked images and verify style consistency, so that I can confirm the batch is ready for production.

#### Acceptance Criteria

1. WHEN a session enters BATCH_REVIEW phase, THE System SHALL display all assets with their locked status
2. THE System SHALL calculate and display the percentage of locked assets
3. THE System SHALL display style consistency scores for all assets
4. THE System SHALL allow users to unlock assets and return to SINGLE_ITERATION phase if needed
5. THE System SHALL prevent regeneration in BATCH_REVIEW phase
6. WHEN the user approves the batch, THE System SHALL allow transition to STYLE_LOCKED phase

### Requirement 11: API Endpoints for Iteration Workflow

**User Story:** As a frontend developer, I want clear API endpoints for the iteration workflow, so that I can build the user interface.

#### Acceptance Criteria

1. THE System SHALL provide POST /api/v1/feedback/per-image endpoint accepting assetId, feedbackText, sessionId, batchId, iterationNumber
2. THE System SHALL provide POST /api/v1/feedback/batch-level endpoint accepting sessionId, batchId, feedbackText, iterationNumber
3. THE System SHALL provide POST /api/v1/assets/{assetId}/lock endpoint to lock an asset
4. THE System SHALL provide POST /api/v1/assets/{assetId}/unlock endpoint to unlock an asset
5. THE System SHALL provide GET /api/v1/batches/{batchId}/assets endpoint returning all assets with locked status and iteration info
6. THE System SHALL provide POST /api/v1/batches/{batchId}/regenerate endpoint to trigger selective regeneration
7. THE System SHALL provide GET /api/v1/sessions/{sessionId}/iteration-status endpoint returning current iteration, locked count, and transition eligibility

### Requirement 12: PromptEngineerAgent Integration

**User Story:** As the system orchestrating refinement, I want to integrate PromptEngineerAgent with per-image and batch-level feedback, so that prompt refinement considers both individual and holistic improvements.

#### Acceptance Criteria

1. WHEN batch-level feedback is submitted, THE System SHALL invoke PromptEngineerAgent with the feedback text
2. THE System SHALL provide PromptEngineerAgent with the current master prompt and prompt history
3. THE System SHALL provide PromptEngineerAgent with per-image feedback for unlocked assets
4. THE PromptEngineerAgent SHALL refine the master prompt while preserving locked elements from the style profile
5. THE System SHALL store the refined master prompt in the session record
6. THE System SHALL use the refined master prompt for all subsequent regenerations in the current iteration

### Requirement 13: DynamoDB Schema Extensions

**User Story:** As a system architect, I want to extend existing DynamoDB tables to support iteration workflow data, so that the feature integrates seamlessly with the current architecture.

#### Acceptance Criteria

1. THE AssetQL-assets table SHALL add fields: locked (boolean), locked_at_iteration (number), current_iteration (number), iteration_history (list), csv_row_index (number), csv_metadata (map), display_name (string)
2. THE AssetQL-feedback table SHALL add fields: type (string: "per_image" or "batch_level"), assetId (string, optional)
3. THE AssetQL-sessions table SHALL add fields: current_iteration (number), max_iterations (number), master_prompt (string), prompt_history (list)
4. THE AssetQL-batches table SHALL add fields: current_iteration (number), locked_count (number), total_count (number)
5. THE System SHALL create GSI on AssetQL-feedback table: type-sessionId-iterationNumber-index
6. THE System SHALL create GSI on AssetQL-assets table: batchId-locked-index

### Requirement 14: UI Requirements for Iteration Workflow

**User Story:** As a user interacting with the iteration workflow, I want an intuitive UI that shows iteration progress, locked status, and feedback options, so that I can efficiently refine my batch.

#### Acceptance Criteria

1. THE UI SHALL display all assets in a grid with CSV metadata (item name) visible
2. THE UI SHALL show a lock icon on each asset with toggle functionality
3. THE UI SHALL show the current iteration number for each asset
4. THE UI SHALL provide a per-image feedback form accessible from each asset card
5. THE UI SHALL provide a batch-level feedback form at the top of the page
6. THE UI SHALL display iteration progress (e.g., "Iteration 2 of 3")
7. THE UI SHALL display locked asset count (e.g., "8 of 10 locked")
8. THE UI SHALL show a "Regenerate Unlocked" button that triggers selective regeneration
9. THE UI SHALL disable regeneration when max_iterations is reached
10. THE UI SHALL show a "Proceed to Batch Review" button when transition criteria are met
11. THE UI SHALL display a loading state during regeneration with progress updates

### Requirement 15: Backward Compatibility and Migration

**User Story:** As a system administrator, I want the new iteration workflow to coexist with existing sessions, so that in-progress batches are not disrupted.

#### Acceptance Criteria

1. THE System SHALL apply default values for new fields to existing asset records (locked: false, current_iteration: 1)
2. THE System SHALL apply default values for new fields to existing session records (current_iteration: 1, max_iterations: 3)
3. THE System SHALL support existing single-test-image workflow for sessions created before the feature deployment
4. THE System SHALL migrate existing feedback records to type "batch_level" if type field is missing
5. THE System SHALL handle missing CSV metadata gracefully by using assetId as display_name

### Requirement 16: Error Handling and Edge Cases

**User Story:** As a user encountering errors during iteration, I want clear error messages and recovery options, so that I can continue my workflow without losing progress.

#### Acceptance Criteria

1. IF PromptEngineerAgent fails, THEN THE System SHALL retry up to 3 times with exponential backoff
2. IF PromptEngineerAgent fails after retries, THEN THE System SHALL return an error message and preserve the current master prompt
3. IF selective regeneration fails for an asset, THEN THE System SHALL mark the asset as "regeneration_failed" and continue with other assets
4. IF all regenerations fail, THEN THE System SHALL return an error and allow the user to retry
5. IF a user attempts to lock an asset that failed generation, THEN THE System SHALL prevent locking and display an error
6. IF a user attempts to transition to BATCH_REVIEW with failed assets, THEN THE System SHALL display a warning listing the failed assets
7. IF the Generation_Queue is full, THEN THE System SHALL return a 429 error and suggest retrying later

### Requirement 17: Performance and Scalability

**User Story:** As a system handling large batches, I want the iteration workflow to perform efficiently, so that users experience minimal wait times.

#### Acceptance Criteria

1. THE System SHALL process selective regeneration requests within 5 seconds (excluding actual generation time)
2. THE System SHALL batch SQS messages in groups of 10 for regeneration tasks
3. THE System SHALL use DynamoDB batch operations for updating multiple asset records
4. THE System SHALL cache session and batch metadata to reduce DynamoDB read operations
5. THE System SHALL support batches up to 500 assets without performance degradation
6. THE System SHALL provide real-time progress updates via WebSocket for regeneration status

### Requirement 18: Cost Optimization

**User Story:** As a product owner, I want the iteration workflow to minimize AI generation costs, so that the platform remains economically viable.

#### Acceptance Criteria

1. THE System SHALL only regenerate unlocked assets, avoiding redundant generation costs
2. THE System SHALL use Amazon Nova Lite for prompt refinement (ultra-low-cost)
3. THE System SHALL limit max_iterations to 3 by default to cap generation costs per asset
4. THE System SHALL track generation cost per asset and display total batch cost
5. THE System SHALL allow administrators to configure max_iterations per pricing tier
6. THE System SHALL warn users when batch cost exceeds a configurable threshold

### Requirement 19: Audit Trail and Analytics

**User Story:** As a product manager, I want to track iteration workflow usage and effectiveness, so that I can optimize the feature based on user behavior.

#### Acceptance Criteria

1. THE System SHALL log each iteration cycle with timestamp, locked count, and feedback count
2. THE System SHALL track average iterations per batch
3. THE System SHALL track average lock rate per iteration
4. THE System SHALL track PromptEngineerAgent invocation success rate
5. THE System SHALL track selective regeneration success rate
6. THE System SHALL provide analytics dashboard showing iteration workflow metrics

### Requirement 20: Round-Trip Property for Prompt Refinement

**User Story:** As a system ensuring prompt quality, I want to verify that refined prompts maintain semantic consistency, so that refinement doesn't introduce unintended changes.

#### Acceptance Criteria

1. WHEN PromptEngineerAgent refines a prompt, THE System SHALL validate that locked style elements are preserved
2. THE System SHALL compare the refined prompt against the style profile descriptors
3. IF the refined prompt deviates from locked style elements, THEN THE System SHALL reject the refinement and log a warning
4. THE System SHALL provide a prompt validation endpoint for testing refinement quality
5. FOR ALL valid refinements, THE System SHALL ensure that parsing the refined prompt extracts the same locked elements (round-trip property)
