const { dynamo, s3, response, QueryCommand, GetCommand, ScanCommand } = require('../../shared');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Assets Handler Lambda
 * 
 * GET /api/v1/assets - List all assets for authenticated user
 * GET /api/v1/assets/{assetId} - Get specific asset with presigned URL
 */
exports.handler = async (event) => {
  try {
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    if (httpMethod === 'GET' && pathParameters.assetId) {
      return await getAsset(event);
    } else if (httpMethod === 'GET' && !pathParameters.assetId) {
      return await listAssets(event);
    } else {
      return response(400, { error: 'Invalid request method or path' });
    }
  } catch (error) {
    console.error('Assets handler error:', error);
    return response(500, { error: 'Internal server error', details: error.message });
  }
};

/**
 * GET /api/v1/assets
 * Lists all assets for the authenticated user
 */
async function listAssets(event) {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    console.log('[listAssets] userId:', userId);

    // Scan assets by userId (no GSI available for userId-createdAt)
    const result = await dynamo.send(new ScanCommand({
      TableName: process.env.ASSETS_TABLE_NAME,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }));

    console.log('[listAssets] Found items:', result.Items?.length || 0);

    // Sort by createdAt descending (newest first)
    const sortedAssets = (result.Items || []).sort((a, b) => 
      (b.createdAt || 0) - (a.createdAt || 0)
    );

    // Generate presigned URLs for each asset
    const assetsWithUrls = await Promise.all(
      sortedAssets.map(async (asset) => {
        try {
          // Generate presigned URL for the main image
          const imageUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: asset.s3Key
            }),
            { expiresIn: 3600 } // 1 hour
          );

          // Generate presigned URL for thumbnail if exists
          let thumbnailUrl = null;
          if (asset.thumbnailKey) {
            thumbnailUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: asset.thumbnailKey
              }),
              { expiresIn: 3600 }
            );
          }

          return {
            ...asset,
            imageUrl,
            thumbnailUrl
          };
        } catch (err) {
          console.error(`Failed to generate URL for asset ${asset.assetId}:`, err);
          return asset;
        }
      })
    );

    return response(200, {
      assets: assetsWithUrls,
      count: assetsWithUrls.length
    });

  } catch (error) {
    console.error('Error listing assets:', error);
    return response(500, { error: 'Failed to list assets', details: error.message });
  }
}

/**
 * GET /api/v1/assets/{assetId}
 * Gets a specific asset with presigned URL
 */
async function getAsset(event) {
  try {
    const assetId = event.pathParameters.assetId;

    const result = await dynamo.send(new GetCommand({
      TableName: process.env.ASSETS_TABLE_NAME,
      Key: { assetId }
    }));

    if (!result.Item) {
      return response(404, { error: 'Asset not found', assetId });
    }

    const asset = result.Item;

    // Generate presigned URL for the image
    const imageUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: asset.s3Key
      }),
      { expiresIn: 3600 }
    );

    // Generate presigned URL for thumbnail if exists
    let thumbnailUrl = null;
    if (asset.thumbnailKey) {
      thumbnailUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: asset.thumbnailKey
        }),
        { expiresIn: 3600 }
      );
    }

    return response(200, {
      ...asset,
      imageUrl,
      thumbnailUrl
    });

  } catch (error) {
    console.error('Error fetching asset:', error);
    return response(500, { error: 'Failed to fetch asset', details: error.message });
  }
}
