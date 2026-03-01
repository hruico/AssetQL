const { v4: uuidv4 } = require('uuid');
const { dynamo, response, PutCommand, GetCommand, UpdateCommand } = require('../../shared');

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const body = JSON.parse(event.body);
  
  // body contains: { sessionId, feedback, assetIds, rating }
  const { sessionId, feedback, assetIds, rating } = body;

  if (!sessionId || !feedback) {
    return response(400, { error: 'sessionId and feedback are required' });
  }

  try {
    // 1. Get current session to determine iteration number
    const sessionResult = await dynamo.send(new GetCommand({
      TableName: process.env.SESSIONS_TABLE_NAME,
      Key: { sessionId }
    }));

    if (!sessionResult.Item) {
      return response(404, { error: 'Session not found' });
    }

    const session = sessionResult.Item;
    
    // Verify user owns this session
    if (session.userId !== userId) {
      return response(403, { error: 'Unauthorized access to session' });
    }

    // 2. Determine iteration number (increment from last feedback or start at 1)
    const currentIteration = (session.currentIteration || 0) + 1;

    // 3. Create feedback record
    const feedbackId = uuidv4();
    const timestamp = Date.now();

    await dynamo.send(new PutCommand({
      TableName: process.env.FEEDBACK_TABLE_NAME,
      Item: {
        sessionId,
        iterationNumber: currentIteration,
        feedbackId,
        userId,
        feedback,
        assetIds: assetIds || [],
        rating: rating || null,
        createdAt: timestamp
      }
    }));

    // 4. Update session with current iteration number
    await dynamo.send(new UpdateCommand({
      TableName: process.env.SESSIONS_TABLE_NAME,
      Key: { sessionId },
      UpdateExpression: 'SET currentIteration = :iter, lastFeedbackAt = :ts',
      ExpressionAttributeValues: {
        ':iter': currentIteration,
        ':ts': timestamp
      }
    }));

    return response(201, {
      feedbackId,
      sessionId,
      iterationNumber: currentIteration,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return response(500, { error: 'Failed to submit feedback', details: error.message });
  }
};
