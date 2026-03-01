const { dynamo, s3, QueryCommand, GetObjectCommand,GetCommand , PutObjectCommand, response } = require('../../shared');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

/**
 * Export Handler Lambda
 * 
 * Triggered by: API Gateway POST /api/v1/sessions/{sessionId}/export
 * Purpose: Collect all generated image S3 keys for a completed batch and produce a downloadable ZIP
 * 
 * Flow:
 * 1. Fetch session and validate it has a linked batch
 * 2. Query all COMPLETED tasks for the batch
 * 3. Stream S3 objects into a ZIP file in /tmp
 * 4. Upload ZIP to S3 at exports/{sessionId}/{timestamp}.zip
 * 5. Generate presigned URL with 1-hour expiry
 * 6. Return presigned URL and asset count
 */
exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { sessionId } = event.pathParameters;

  // Step 1: Fetch session
  let session;
  try {
    const sessionResult = await dynamo.send(new GetCommand({
      TableName: process.env.SESSIONS_TABLE_NAME,
      Key: { sessionId }
    }));

    session = sessionResult.Item;
    if (!session) {
      return response(404, {
        error: 'Session not found',
        sessionId
      });
    }
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return response(500, {
      error: 'Failed to fetch session',
      message: error.message
    });
  }

  const { batchId } = session;
  if (!batchId) {
    return response(400, {
      error: 'No batch linked to session',
      message: 'Session must have a linked batchId to export assets'
    });
  }

  // Step 2: Query all COMPLETED tasks for this batch
  let completedTasks = [];
  try {
    const tasksResult = await dynamo.send(new QueryCommand({
      TableName: process.env.TASKS_TABLE_NAME,
      IndexName: 'batchId-status-index',
      KeyConditionExpression: 'batchId = :batchId AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':batchId': batchId,
        ':status': 'COMPLETED'
      }
    }));

    completedTasks = tasksResult.Items || [];
  } catch (error) {
    console.error('Failed to query completed tasks:', error);
    return response(500, {
      error: 'Failed to query completed tasks',
      message: error.message
    });
  }

  if (completedTasks.length === 0) {
    return response(400, {
      error: 'No completed assets to export',
      message: 'Batch has no completed tasks',
      batchId
    });
  }

  // Step 3: Create ZIP file using archiver with streaming
  const timestamp = Date.now();
  const zipFileName = `export-${sessionId}-${timestamp}.zip`;
  const zipFilePath = path.join('/tmp', zipFileName);
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', {
    zlib: { level: 6 } // Compression level (0-9)
  });

  // Pipe archive to file
  archive.pipe(output);

  try {
    // Stream each S3 object into the ZIP
    for (const task of completedTasks) {
      if (!task.s3Key) {
        console.warn(`Task ${task.taskId} has no s3Key, skipping`);
        continue;
      }

      try {
        // Get S3 object
        const s3Object = await s3.send(new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: task.s3Key
        }));

        // Extract filename from S3 key
        const fileName = task.s3Key.split('/').pop();

        // Add file to archive with streaming
        archive.append(s3Object.Body, { name: fileName });
      } catch (s3Error) {
        console.error(`Failed to fetch S3 object ${task.s3Key}:`, s3Error);
        // Continue with other files even if one fails
      }
    }

    // Finalize the archive
    await archive.finalize();

    // Wait for the output stream to finish
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });

  } catch (error) {
    console.error('Failed to create ZIP archive:', error);
    return response(500, {
      error: 'Failed to create export archive',
      message: error.message
    });
  }

  // Step 4: Upload ZIP to S3
  const exportS3Key = `exports/${sessionId}/${timestamp}.zip`;
  try {
    const zipFileBuffer = fs.readFileSync(zipFilePath);
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: exportS3Key,
      Body: zipFileBuffer,
      ContentType: 'application/zip'
    }));

    // Clean up temp file
    fs.unlinkSync(zipFilePath);
  } catch (error) {
    console.error('Failed to upload ZIP to S3:', error);
    try { fs.unlinkSync(zipFilePath); } catch (_) {}
    return response(500, {
      error: 'Failed to upload export archive',
      message: error.message
    });
  }

  // Step 5: Generate presigned URL with 1-hour expiry
  let presignedUrl;
  try {
    const getObjectParams = {
      Bucket: process.env.S3_BUCKET,
      Key: exportS3Key
    };

    presignedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand(getObjectParams),
      { expiresIn: 3600 } // 1 hour
    );
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    return response(500, {
      error: 'Failed to generate download URL',
      message: error.message
    });
  }

  // Step 6: Return success with presigned URL
  return response(200, {
    message: 'Export completed successfully',
    sessionId,
    batchId,
    downloadUrl: presignedUrl,
    expiresIn: 3600,
    exportedAssetCount: completedTasks.length,
    exportS3Key
  });
};
