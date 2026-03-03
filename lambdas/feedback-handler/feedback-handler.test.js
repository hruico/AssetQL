const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const fc = require('fast-check');

// Mock getSignedUrl before importing handler
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn((client, command, options) => {
    // Extract the Key from the command input
    const key = command.input.Key;
    const bucket = command.input.Bucket;
    // Return a mock presigned URL
    return Promise.resolve(`https://${bucket}.s3.amazonaws.com/${key}?X-Amz-Signature=mock`);
  })
}));

// Mock AWS clients
const dynamoMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);

// Import handler after mocks are set up
const { handler } = require('./index');

describe('Feedback Handler - Bug Condition Exploration', () => {
  beforeEach(() => {
    dynamoMock.reset();
    s3Mock.reset();
    
    // Set required environment variables
    process.env.SESSIONS_TABLE_NAME = 'AssetQL-sessions';
    process.env.BATCHES_TABLE_NAME = 'AssetQL-batches';
    process.env.ASSETS_TABLE_NAME = 'AssetQL-assets';
    process.env.FEEDBACK_TABLE_NAME = 'AssetQL-feedback';
    process.env.S3_BUCKET = 'assetql-assets';
  });

  /**
   * **Validates: Requirements 2.1, 2.2, 2.3**
   * 
   * Property 1: Fault Condition - Assets Include Presigned URLs
   * 
   * This test verifies that assets returned by GET /api/v1/feedback/{sessionId}/assets
   * include s3Url and thumbnailUrl fields with valid presigned URLs.
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
   * The test encodes the expected behavior and will validate the fix when it passes.
   */
  describe('Property 1: Assets Must Include Presigned URLs', () => {
    test('Assets with s3Key must include s3Url field with valid presigned URL', async () => {
      const sessionId = 'test-session-123';
      const userId = 'user-456';
      const batchId = 'batch-789';
      const assetId = 'asset-001';

      // Mock session lookup
      dynamoMock.on(GetCommand, {
        TableName: 'AssetQL-sessions',
        Key: { sessionId }
      }).resolves({
        Item: {
          sessionId,
          userId,
          batchId,
          phase: 'BATCH_REVIEW'
        }
      });

      // Mock batch lookup
      dynamoMock.on(GetCommand, {
        TableName: 'AssetQL-batches',
        Key: { batchId }
      }).resolves({
        Item: {
          batchId,
          userId,
          status: 'completed'
        }
      });

      // Mock assets query - returns asset with s3Key but NO s3Url (bug condition)
      dynamoMock.on(QueryCommand, {
        TableName: 'AssetQL-assets',
        IndexName: 'batchId-createdAt-index'
      }).resolves({
        Items: [{
          assetId,
          batchId,
          s3Key: `raw/${batchId}/${assetId}.png`,
          thumbnailKey: `thumbnails/${assetId}_thumb.jpg`,
          createdAt: Date.now()
        }]
      });

      // Create API Gateway event
      const event = {
        httpMethod: 'GET',
        path: `/api/v1/feedback/${sessionId}/assets`,
        pathParameters: { sessionId },
        requestContext: {
          authorizer: {
            claims: { sub: userId }
          }
        }
      };

      // Call handler
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assertions - Expected behavior (will FAIL on unfixed code)
      expect(result.statusCode).toBe(200);
      expect(body.assets).toBeDefined();
      expect(body.assets.length).toBeGreaterThan(0);

      const asset = body.assets[0];
      
      // CRITICAL ASSERTIONS: These will FAIL on unfixed code, proving the bug exists
      expect(asset.s3Url).toBeDefined();
      expect(asset.s3Url).not.toBeNull();
      expect(typeof asset.s3Url).toBe('string');
      expect(asset.s3Url).toMatch(/^https:\/\//);
      expect(asset.s3Url).toContain(asset.s3Key);
      
      // Verify thumbnailUrl is also present
      expect(asset.thumbnailUrl).toBeDefined();
      expect(asset.thumbnailUrl).not.toBeNull();
      expect(typeof asset.thumbnailUrl).toBe('string');
      expect(asset.thumbnailUrl).toMatch(/^https:\/\//);
      expect(asset.thumbnailUrl).toContain(asset.thumbnailKey);
    });

    test('Assets with thumbnailKey must include thumbnailUrl field', async () => {
      const sessionId = 'test-session-456';
      const userId = 'user-789';
      const batchId = 'batch-012';
      const assetId = 'asset-002';

      // Mock session lookup
      dynamoMock.on(GetCommand, {
        TableName: 'AssetQL-sessions',
        Key: { sessionId }
      }).resolves({
        Item: {
          sessionId,
          userId,
          batchId,
          phase: 'BATCH_REVIEW'
        }
      });

      // Mock batch lookup
      dynamoMock.on(GetCommand, {
        TableName: 'AssetQL-batches',
        Key: { batchId }
      }).resolves({
        Item: {
          batchId,
          userId,
          status: 'completed'
        }
      });

      // Mock assets query
      dynamoMock.on(QueryCommand, {
        TableName: 'AssetQL-assets',
        IndexName: 'batchId-createdAt-index'
      }).resolves({
        Items: [{
          assetId,
          batchId,
          s3Key: `raw/${batchId}/${assetId}.png`,
          thumbnailKey: `thumbnails/${assetId}_thumb.jpg`,
          createdAt: Date.now()
        }]
      });

      const event = {
        httpMethod: 'GET',
        path: `/api/v1/feedback/${sessionId}/assets`,
        pathParameters: { sessionId },
        requestContext: {
          authorizer: {
            claims: { sub: userId }
          }
        }
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      const asset = body.assets[0];

      // CRITICAL: thumbnailUrl must be present (will FAIL on unfixed code)
      expect(asset.thumbnailUrl).toBeDefined();
      expect(asset.thumbnailUrl).not.toBeNull();
      expect(asset.thumbnailUrl).toMatch(/^https:\/\//);
    });

    test('Multiple assets must all include presigned URLs', async () => {
      const sessionId = 'test-session-multi';
      const userId = 'user-multi';
      const batchId = 'batch-multi';

      // Mock session lookup
      dynamoMock.on(GetCommand, {
        TableName: 'AssetQL-sessions',
        Key: { sessionId }
      }).resolves({
        Item: {
          sessionId,
          userId,
          batchId,
          phase: 'BATCH_REVIEW'
        }
      });

      // Mock batch lookup
      dynamoMock.on(GetCommand, {
        TableName: 'AssetQL-batches',
        Key: { batchId }
      }).resolves({
        Item: {
          batchId,
          userId,
          status: 'completed'
        }
      });

      // Mock assets query with multiple assets
      const assets = Array.from({ length: 10 }, (_, i) => ({
        assetId: `asset-${i}`,
        batchId,
        s3Key: `raw/${batchId}/asset-${i}.png`,
        thumbnailKey: `thumbnails/asset-${i}_thumb.jpg`,
        createdAt: Date.now() + i
      }));

      dynamoMock.on(QueryCommand, {
        TableName: 'AssetQL-assets',
        IndexName: 'batchId-createdAt-index'
      }).resolves({
        Items: assets
      });

      const event = {
        httpMethod: 'GET',
        path: `/api/v1/feedback/${sessionId}/assets`,
        pathParameters: { sessionId },
        requestContext: {
          authorizer: {
            claims: { sub: userId }
          }
        }
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.assets.length).toBe(10);

      // CRITICAL: ALL assets must have presigned URLs (will FAIL on unfixed code)
      body.assets.forEach((asset, index) => {
        expect(asset.s3Url).toBeDefined();
        expect(asset.s3Url).not.toBeNull();
        expect(asset.s3Url).toMatch(/^https:\/\//);
        expect(asset.s3Url).toContain(asset.s3Key);

        expect(asset.thumbnailUrl).toBeDefined();
        expect(asset.thumbnailUrl).not.toBeNull();
        expect(asset.thumbnailUrl).toMatch(/^https:\/\//);
        expect(asset.thumbnailUrl).toContain(asset.thumbnailKey);
      });
    });

    test('Asset with s3Key but no thumbnailKey must include s3Url (thumbnailUrl can be null)', async () => {
      const sessionId = 'test-session-no-thumb';
      const userId = 'user-no-thumb';
      const batchId = 'batch-no-thumb';
      const assetId = 'asset-no-thumb';

      // Mock session lookup
      dynamoMock.on(GetCommand, {
        TableName: 'AssetQL-sessions',
        Key: { sessionId }
      }).resolves({
        Item: {
          sessionId,
          userId,
          batchId,
          phase: 'BATCH_REVIEW'
        }
      });

      // Mock batch lookup
      dynamoMock.on(GetCommand, {
        TableName: 'AssetQL-batches',
        Key: { batchId }
      }).resolves({
        Item: {
          batchId,
          userId,
          status: 'completed'
        }
      });

      // Mock assets query - asset with s3Key but NO thumbnailKey
      dynamoMock.on(QueryCommand, {
        TableName: 'AssetQL-assets',
        IndexName: 'batchId-createdAt-index'
      }).resolves({
        Items: [{
          assetId,
          batchId,
          s3Key: `raw/${batchId}/${assetId}.png`,
          // No thumbnailKey
          createdAt: Date.now()
        }]
      });

      const event = {
        httpMethod: 'GET',
        path: `/api/v1/feedback/${sessionId}/assets`,
        pathParameters: { sessionId },
        requestContext: {
          authorizer: {
            claims: { sub: userId }
          }
        }
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      const asset = body.assets[0];

      // CRITICAL: s3Url must be present even without thumbnailKey (will FAIL on unfixed code)
      expect(asset.s3Url).toBeDefined();
      expect(asset.s3Url).not.toBeNull();
      expect(asset.s3Url).toMatch(/^https:\/\//);
      expect(asset.s3Url).toContain(asset.s3Key);

      // thumbnailUrl can be null when thumbnailKey is missing
      // This is acceptable behavior
    });
  });
});
