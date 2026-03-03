const { dynamo, bedrockAgentRuntime, s3, GetCommand, PutCommand, QueryCommand, response, InvokeAgentCommand, GetObjectCommand } = require('../../shared');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

exports.handler = async (event) => {
  try {
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const path = event.path || '';

    if (httpMethod === 'GET' && pathParameters.sessionId && path.includes('/assets')) {
      // GET /api/v1/feedback/{sessionId}/assets - Get assets for review
      return await getSessionAssets(event);
    } else if (httpMethod === 'POST' && pathParameters.sessionId) {
      // POST /api/v1/feedback/{sessionId} - Submit feedback and refine prompt
      return await submitFeedback(event);
    } else if (httpMethod === 'GET' && pathParameters.sessionId) {
      // GET /api/v1/feedback/{sessionId} - Get feedback history
      return await getFeedbackHistory(event);
    } else {
      return response(400, { error: 'Invalid request method or path' });
    }
  } catch (error) {
    console.error('Feedback handler error:', error);
    return response(500, { error: error.message });
  }
};

/**
 * GET /api/v1/feedback/{sessionId}/assets
 * Retrieves all assets generated for this session's batch
 */
async function getSessionAssets(event) {
  const userId = event.requestContext.authorizer.claims.sub;
  const { sessionId } = event.pathParameters;

  console.log('getSessionAssets called for sessionId:', sessionId);

  // Get session to find batchId
  const sessionRes = await dynamo.send(new GetCommand({
    TableName: process.env.SESSIONS_TABLE_NAME,
    Key: { sessionId }
  }));

  if (!sessionRes.Item) {
    console.log('Session not found:', sessionId);
    return response(404, { error: 'Session not found' });
  }

  const session = sessionRes.Item;
  console.log('Session found:', JSON.stringify(session));

  // Verify ownership
  if (session.userId !== userId) {
    return response(403, { error: 'Forbidden' });
  }

  // If no batchId in session, try to find batches for this user
  let batchId = session.batchId;
  
  if (!batchId) {
    console.log('No batchId in session, searching for user batches...');
    
    // Query batches by userId to find recent batches
    const batchesRes = await dynamo.send(new QueryCommand({
      TableName: process.env.BATCHES_TABLE_NAME,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false, // Most recent first
      Limit: 10
    }));

    console.log('Found batches:', batchesRes.Items?.length || 0);

    if (!batchesRes.Items || batchesRes.Items.length === 0) {
      return response(200, {
        session,
        batch: null,
        assets: [],
        totalAssets: 0,
        message: 'No batches found. Please generate a test batch in the Single Iteration phase.'
      });
    }

    // Use the most recent batch
    batchId = batchesRes.Items[0].batchId;
    console.log('Using most recent batch:', batchId);
  }

  // Get batch details
  const batchRes = await dynamo.send(new GetCommand({
    TableName: process.env.BATCHES_TABLE_NAME,
    Key: { batchId }
  }));

  if (!batchRes.Item) {
    console.log('Batch not found:', batchId);
    return response(404, { error: 'Batch not found' });
  }

  console.log('Batch found:', JSON.stringify(batchRes.Item));

  // Get all assets for this batch
  const assetsRes = await dynamo.send(new QueryCommand({
    TableName: process.env.ASSETS_TABLE_NAME,
    IndexName: 'batchId-createdAt-index',
    KeyConditionExpression: 'batchId = :batchId',
    ExpressionAttributeValues: { ':batchId': batchId }
  }));

  console.log('Assets found:', assetsRes.Items?.length || 0);

  // Generate presigned URLs for each asset
  const assetsWithUrls = await Promise.all(
    (assetsRes.Items || []).map(async (asset) => {
      try {
        // Generate presigned URL for main asset
        let s3Url = null;
        if (asset.s3Key) {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: asset.s3Key
          });
          s3Url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        }

        // Generate presigned URL for thumbnail
        let thumbnailUrl = null;
        if (asset.thumbnailKey) {
          const thumbCommand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: asset.thumbnailKey
          });
          thumbnailUrl = await getSignedUrl(s3, thumbCommand, { expiresIn: 3600 });
        }

        return {
          ...asset,
          s3Url,
          thumbnailUrl
        };
      } catch (error) {
        console.error('Error generating presigned URL for asset:', asset.assetId, error);
        // Return original asset if URL generation fails
        return asset;
      }
    })
  );

  return response(200, {
    session,
    batch: batchRes.Item,
    assets: assetsWithUrls,
    totalAssets: assetsWithUrls.length
  });
}

/**
 * POST /api/v1/feedback/{sessionId}
 * Submit feedback and invoke PromptEngineerAgent to refine the prompt
 * 
 * Body: {
 *   feedbackText: "Make the colors more vibrant",
 *   assetId: "optional-specific-asset-id",
 *   rating: 1-5 (optional)
 * }
 */
async function submitFeedback(event) {
  const userId = event.requestContext.authorizer.claims.sub;
  const { sessionId } = event.pathParameters;
  const body = JSON.parse(event.body || '{}');
  const { feedbackText, assetId, rating } = body;

  if (!feedbackText) {
    return response(400, { error: 'feedbackText is required' });
  }

  // Get session
  const sessionRes = await dynamo.send(new GetCommand({
    TableName: process.env.SESSIONS_TABLE_NAME,
    Key: { sessionId }
  }));

  if (!sessionRes.Item) {
    return response(404, { error: 'Session not found' });
  }

  const session = sessionRes.Item;

  // Verify ownership
  if (session.userId !== userId) {
    return response(403, { error: 'Forbidden' });
  }

  // Get current iteration number
  const feedbackHistoryRes = await dynamo.send(new QueryCommand({
    TableName: process.env.FEEDBACK_TABLE_NAME,
    KeyConditionExpression: 'sessionId = :sid',
    ExpressionAttributeValues: { ':sid': sessionId },
    ScanIndexForward: false,
    Limit: 1
  }));

  const lastIteration = feedbackHistoryRes.Items?.[0]?.iterationNumber || 0;
  const newIterationNumber = lastIteration + 1;

  // Save feedback to DynamoDB
  await dynamo.send(new PutCommand({
    TableName: process.env.FEEDBACK_TABLE_NAME,
    Item: {
      sessionId,
      iterationNumber: newIterationNumber,
      feedbackText,
      assetId: assetId || null,
      rating: rating || null,
      timestamp: Date.now(),
      userId
    }
  }));

  // Invoke PromptEngineerAgent to refine the prompt
  try {
    const agentInput = `Session ID: ${sessionId}

Current Master Prompt: ${session.masterPrompt || 'Not yet defined'}

User Feedback (Iteration ${newIterationNumber}):
${feedbackText}

Please:
1. Retrieve the feedback history using GetFeedbackLedger
2. Refine the master prompt using RefinePrompt based on this feedback
3. Respect all locked style elements
4. Return the refined prompt and updated locked elements`;

    const invokeCommand = new InvokeAgentCommand({
      agentId: process.env.PROMPT_ENGINEER_AGENT_ID,
      agentAliasId: process.env.PROMPT_ENGINEER_ALIAS_ID,
      sessionId: `feedback-${sessionId}-${newIterationNumber}`,
      inputText: agentInput
    });

    const agentResponse = await bedrockAgentRuntime.send(invokeCommand);

    // Parse agent response
    let refinedPrompt = session.masterPrompt;
    let updatedLockedElements = session.lockedStyleElements || [];
    let updatedActiveRefinements = session.activeRefinements || [];

    // Extract text from agent response stream
    if (agentResponse.completion) {
      for await (const event of agentResponse.completion) {
        if (event.chunk && event.chunk.bytes) {
          const chunkText = new TextDecoder().decode(event.chunk.bytes);
          try {
            const chunkData = JSON.parse(chunkText);
            if (chunkData.refinedPrompt) {
              refinedPrompt = chunkData.refinedPrompt;
              updatedLockedElements = chunkData.updatedLockedElements || updatedLockedElements;
              updatedActiveRefinements = chunkData.updatedActiveRefinements || updatedActiveRefinements;
            }
          } catch (e) {
            // Not JSON, might be plain text response
            console.log('Agent response chunk:', chunkText);
          }
        }
      }
    }

    return response(200, {
      message: 'Feedback submitted and prompt refined',
      iterationNumber: newIterationNumber,
      refinedPrompt,
      updatedLockedElements,
      updatedActiveRefinements,
      sessionId
    });

  } catch (agentError) {
    console.error('Error invoking PromptEngineerAgent:', agentError);
    
    // Still save the feedback even if agent fails
    return response(200, {
      message: 'Feedback submitted (agent refinement failed)',
      iterationNumber: newIterationNumber,
      error: agentError.message,
      sessionId
    });
  }
}

/**
 * GET /api/v1/feedback/{sessionId}
 * Get feedback history for a session
 */
async function getFeedbackHistory(event) {
  const userId = event.requestContext.authorizer.claims.sub;
  const { sessionId } = event.pathParameters;

  // Get session to verify ownership
  const sessionRes = await dynamo.send(new GetCommand({
    TableName: process.env.SESSIONS_TABLE_NAME,
    Key: { sessionId }
  }));

  if (!sessionRes.Item) {
    return response(404, { error: 'Session not found' });
  }

  if (sessionRes.Item.userId !== userId) {
    return response(403, { error: 'Forbidden' });
  }

  // Get feedback history
  const feedbackRes = await dynamo.send(new QueryCommand({
    TableName: process.env.FEEDBACK_TABLE_NAME,
    KeyConditionExpression: 'sessionId = :sid',
    ExpressionAttributeValues: { ':sid': sessionId },
    ScanIndexForward: true // Ascending by iteration number
  }));

  return response(200, {
    session: sessionRes.Item,
    feedbackHistory: feedbackRes.Items || []
  });
}
