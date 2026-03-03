# Bugfix Requirements Document

## Introduction

This bugfix addresses the issue where generated asset images are not displaying in the Batch Review phase of the Session Detail page. Users see black boxes instead of images because the feedback-handler Lambda returns asset data with only `s3Key` fields, while the frontend expects `s3Url` or `thumbnailUrl` fields to render images. This blocks the critical feedback workflow where users need to review generated images before providing refinement feedback.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the feedback-handler Lambda's getSessionAssets function retrieves assets from DynamoDB THEN the system returns raw DynamoDB items containing only `s3Key` and `thumbnailKey` fields without generating accessible URLs

1.2 WHEN the frontend Session Detail page attempts to render assets using `asset.s3Url || asset.thumbnailUrl` THEN the system displays black boxes because these URL fields are undefined in the API response

1.3 WHEN users navigate to the Batch Review phase THEN the system fails to display any generated images, preventing users from reviewing asset quality before providing feedback

### Expected Behavior (Correct)

2.1 WHEN the feedback-handler Lambda's getSessionAssets function retrieves assets from DynamoDB THEN the system SHALL generate CloudFront URLs from the `s3Key` and `thumbnailKey` fields and include them as `s3Url` and `thumbnailUrl` in the response

2.2 WHEN the frontend Session Detail page attempts to render assets using `asset.s3Url || asset.thumbnailUrl` THEN the system SHALL display the images correctly using the CloudFront URLs provided by the API

2.3 WHEN users navigate to the Batch Review phase THEN the system SHALL display all generated images with visible thumbnails, enabling users to review asset quality and provide feedback

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the feedback-handler Lambda retrieves assets for sessions in other phases (UPLOAD, SINGLE_ITERATION, STYLE_LOCKED, AUTOMATION, COMPLETE) THEN the system SHALL CONTINUE TO return asset data with the same structure and URL fields

3.2 WHEN the feedback-handler Lambda processes feedback submission requests THEN the system SHALL CONTINUE TO store feedback records in DynamoDB without modification to the feedback storage logic

3.3 WHEN assets are retrieved that have `s3Key` but no `thumbnailKey` THEN the system SHALL CONTINUE TO handle this gracefully by generating only the `s3Url` field

3.4 WHEN the frontend renders assets in other parts of the application (asset library, batch detail pages) THEN the system SHALL CONTINUE TO display images correctly using the same URL field structure
