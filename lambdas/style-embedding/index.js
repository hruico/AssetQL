const { s3, dynamo, response, PutCommand, QueryCommand, GetCommand, GetObjectCommand } = require('../../shared/index.js');
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const crypto = require('crypto');

const bedrockClient = new BedrockRuntimeClient({ region: 'ap-south-1' });


exports.handler = async (event) => {
  try {
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    if (httpMethod === 'POST') {
      return await createStyleProfile(event);
    } else if (httpMethod === 'GET' && pathParameters.styleProfileId) {
      return await getStyleProfile(event);
    } else if (httpMethod === 'GET' && !pathParameters.styleProfileId) {
      return await listStyleProfiles(event);
    } else {
      return response(400, { error: 'Invalid request method or path' });
    }
  } catch (error) {
    console.error('=== UNHANDLED ERROR IN STYLE EMBEDDING HANDLER ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token'
      },
      body: JSON.stringify({
        error: 'Internal server error in style embedding',
        message: error.message,
        type: error.name
      })
    };
  }
};

/**
 * POST /api/v1/styles
 * Creates a new style profile from a reference image
 * 
 * NEW ARCHITECTURE: Image is already uploaded to S3 via presigned URL.
 * This Lambda receives only the S3 key, fetches the image, and analyzes it.
 */
async function createStyleProfile(event) {
  try {
    console.log('=== Style Embedding Handler Start ===');
    console.log('HTTP Method:', event.httpMethod);
    console.log('S3_BUCKET defined?', !!process.env.S3_BUCKET);
    console.log('STYLES_TABLE_NAME defined?', !!process.env.STYLES_TABLE_NAME);

    const userId = event.requestContext.authorizer.claims.sub;
    
    // Safe body parsing
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      console.error('Body parse error. Raw body:', event.body?.substring(0, 200));
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ 
          error: 'Invalid request body. Expected JSON with s3Key and name fields.',
          hint: 'Body must be: { "s3Key": "style-references/uuid/file.png", "name": "My Style" }'
        })
      };
    }

    const { s3Key, name, styleProfileId: providedStyleProfileId } = body;

    if (!s3Key) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Missing required field: s3Key' })
      };
    }

    console.log('Parsed body - s3Key:', s3Key, 'name:', name);

    // Use provided styleProfileId or generate new one
    const styleProfileId = providedStyleProfileId || crypto.randomUUID();

    console.log('Fetching image from S3:', s3Key);

    // 1. Fetch the image from S3 (it's already uploaded via presigned URL)
    const s3Response = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key
    }));

    // Convert S3 stream to buffer
    const imageBuffer = await streamToBuffer(s3Response.Body);
    
    // Determine image format from S3 key file extension
    const ext = s3Key.split('.').pop().toLowerCase();
    const imageFormat = (ext === 'jpg' || ext === 'jpeg') ? 'jpeg' : 
                       (ext === 'gif') ? 'gif' :
                       (ext === 'webp') ? 'webp' : 'png';

    console.log('Image fetched successfully, size:', imageBuffer.length, 'bytes', 'format:', imageFormat);

    // 2. Call Bedrock Nova Lite to analyze the style using ConverseCommand
    const converseResponse = await bedrockClient.send(new ConverseCommand({
      modelId: 'apac.amazon.nova-lite-v1:0',
      messages: [{
        role: 'user',
        content: [
          {
            image: {
              format: imageFormat,
              source: {
                bytes: imageBuffer
              }
            }
          },
          {
            text: `Analyze this reference image and extract its visual style. Return ONLY valid JSON with this exact structure, no markdown:
{
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "composition": "description of layout and framing",
  "texture": "description of surface textures",
  "lighting": "description of lighting style",
  "artStyle": "description of art style",
  "mood": "description of emotional tone",
  "negativePrompt": "elements to avoid in generation"
}`
          }
        ]
      }],
      inferenceConfig: {
        maxTokens: 1024,
        temperature: 0.3
      }
    }));

    // Parse the response
    const responseText = converseResponse.output.message.content[0].text;
    // Strip markdown code fences if present
    const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const styleDescriptors = JSON.parse(cleanJson);

    // 3. Save style profile to DynamoDB
    await dynamo.send(new PutCommand({
      TableName: process.env.STYLES_TABLE_NAME,
      Item: {
        styleProfileId,
        userId,
        name: name || 'Untitled Style',
        referenceImageKey: s3Key, // Use the provided S3 key
        descriptors: styleDescriptors,
        lockedParams: [],
        deviationThreshold: 85,
        createdAt: Date.now()
      }
    }));

    console.log('Style profile created successfully:', styleProfileId);

    return response(201, { styleProfile: { styleProfileId, name, descriptors: styleDescriptors } });
    
  } catch (error) {
    console.error('=== ERROR IN CREATE STYLE PROFILE ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token'
      },
      body: JSON.stringify({
        error: 'Failed to create style profile',
        message: error.message,
        type: error.name
      })
    };
  }
}

/**
 * Helper function to convert S3 stream to Buffer
 */
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * GET /api/v1/styles/{styleProfileId}
 * Retrieves a specific style profile
 */
async function getStyleProfile(event) {
  try {
    const styleProfileId = event.pathParameters.styleProfileId;

    const result = await dynamo.send(new GetCommand({
      TableName: process.env.STYLES_TABLE_NAME,
      Key: { styleProfileId }
    }));

    if (!result.Item) {
      return response(404, { error: 'Style profile not found', styleProfileId });
    }

    return response(200, result.Item);

  } catch (error) {
    console.error('Error fetching style profile:', error);
    return response(500, { error: 'Failed to fetch style profile', details: error.message });
  }
}

/**
 * GET /api/v1/styles
 * Lists all style profiles for the authenticated user
 * Returns profiles sorted by creation date (newest first)
 */
async function listStyleProfiles(event) {
  try {
    const userId = event.requestContext.authorizer.claims.sub;

    // Query style profiles by userId using GSI
    const result = await dynamo.send(new QueryCommand({
      TableName: process.env.STYLES_TABLE_NAME,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false // Sort by createdAt descending (newest first)
    }));

    // Generate presigned URLs for reference images
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    
    const profilesWithUrls = await Promise.all(
      (result.Items || []).map(async (profile) => {
        try {
          const referenceUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: profile.referenceImageKey
            }),
            { expiresIn: 3600 }
          );
          return { ...profile, referenceUrl };
        } catch (err) {
          console.error(`Failed to generate URL for ${profile.styleProfileId}:`, err);
          return profile;
        }
      })
    );

    return response(200, {
      styleProfiles: profilesWithUrls
    });

  } catch (error) {
    console.error('Error listing style profiles:', error);
    return response(500, { error: 'Failed to list style profiles', details: error.message });
  }
}
