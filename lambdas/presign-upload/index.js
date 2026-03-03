const { s3, response } = require('../../shared');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

/**
 * POST /api/v1/presign
 * Generates a presigned S3 upload URL for direct client-side uploads
 * 
 * This bypasses API Gateway's 10MB payload limit by allowing the frontend
 * to upload large files directly to S3, then pass only the S3 key to other Lambdas.
 */
exports.handler = async (event) => {
  try {
    console.log('=== Presign Upload Handler Start ===');
    console.log('HTTP Method:', event.httpMethod);
    console.log('S3_BUCKET defined?', !!process.env.S3_BUCKET);
    console.log('S3_BUCKET value:', process.env.S3_BUCKET);

    if (event.httpMethod !== 'POST') {
      return response(405, { error: 'Method not allowed', allowedMethods: ['POST'] });
    }

    const body = JSON.parse(event.body || '{}');
    console.log('Request body:', JSON.stringify(body));
    const { fileName, fileType, folder } = body;

    // Validate required fields
    if (!fileName) {
      console.log('Validation failed: fileName is required');
      return response(400, { error: 'fileName is required' });
    }
    if (!fileType) {
      console.log('Validation failed: fileType is required');
      return response(400, { error: 'fileType is required' });
    }
    if (!folder) {
      console.log('Validation failed: folder is required');
      return response(400, { error: 'folder is required (e.g., "style-references")' });
    }

    // Validate file type (security: only allow images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(fileType)) {
      console.log('Validation failed: Invalid file type:', fileType);
      return response(400, { 
        error: 'Invalid file type', 
        allowedTypes,
        received: fileType 
      });
    }

    // Generate unique S3 key
    const uniqueId = crypto.randomUUID();
    const s3Key = `${folder}/${uniqueId}/${fileName}`;

    console.log('Generating presigned URL for:', s3Key);

    // Create the S3 PutObject command
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      ContentType: fileType
    });

    // Generate presigned URL (valid for 5 minutes)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    console.log('Presigned URL generated successfully');

    return response(200, {
      uploadUrl,
      s3Key,
      expiresIn: 300,
      bucket: process.env.S3_BUCKET
    });

  } catch (error) {
    console.error('=== UNHANDLED ERROR IN PRESIGN HANDLER ===');
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
        error: 'Failed to generate presigned URL',
        message: error.message,
        type: error.name
      })
    };
  }
};
