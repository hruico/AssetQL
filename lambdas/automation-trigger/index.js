const { dynamo, sqs, GetCommand, QueryCommand, SendMessageBatchCommand, UpdateCommand, response } = require('../../shared');

/**
 * Automation Trigger Lambda
 * 
 * Triggered by: API Gateway POST /api/v1/sessions/{sessionId}/automate
 * Purpose: Take style-locked master prompt and enqueue all remaining unprocessed assets for bulk generation
 * 
 * Flow:
 * 1. Validate session is in STYLE_LOCKED phase
 * 2. Read masterPrompt and lockedStyleElements from session
 * 3. Query all PENDING tasks for the batch
 * 4. Build SQS messages with frozen style definition
 * 5. Send messages in batches of 10 (SQS limit + throttling control)
 * 6. Update session phase to AUTOMATION
 */
exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { sessionId } = event.pathParameters;

  // Step 1: Fetch session and validate phase
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

  // Validate phase is STYLE_LOCKED
  if (session.currentPhase !== 'STYLE_LOCKED') {
    return response(409, {
      error: 'Invalid phase for automation',
      message: 'Automation can only be triggered from STYLE_LOCKED phase',
      currentPhase: session.currentPhase,
      expectedPhase: 'STYLE_LOCKED'
    });
  }

  // Step 2: Extract frozen style definition
  const { masterPrompt, lockedStyleElements, batchId } = session;

  if (!batchId) {
    return response(400, {
      error: 'No batch linked to session',
      message: 'Session must have a linked batchId to trigger automation'
    });
  }

  // Step 3: Query all PENDING tasks for this batch
  let pendingTasks = [];
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
        ':status': 'PENDING'
      }
    }));

    pendingTasks = tasksResult.Items || [];
  } catch (error) {
    console.error('Failed to query pending tasks:', error);
    return response(500, {
      error: 'Failed to query pending tasks',
      message: error.message
    });
  }

  if (pendingTasks.length === 0) {
    return response(200, {
      message: 'No pending tasks to enqueue',
      enqueuedCount: 0,
      sessionId,
      batchId
    });
  }

  // Step 4: Build SQS messages from pending tasks
  const sqsMessages = pendingTasks.map(task => {
    // Construct prompt from masterPrompt plus task-specific variables
    const taskPrompt = masterPrompt + (task.assetVariables ? ` ${task.assetVariables}` : '');

    return {
      Id: task.taskId,
      MessageBody: JSON.stringify({
        taskId: task.taskId,
        batchId: batchId,
        sessionId: sessionId,
        prompt: taskPrompt,
        lockedStyleElements: lockedStyleElements || [],
        retryCount: 0
      })
    };
  });

  // Step 5: Send messages to SQS in batches of 10 (SQS limit)
  let enqueuedCount = 0;
  const batchSize = 10;

  try {
    for (let i = 0; i < sqsMessages.length; i += batchSize) {
      const batch = sqsMessages.slice(i, i + batchSize);
      
      await sqs.send(new SendMessageBatchCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        Entries: batch
      }));

      enqueuedCount += batch.length;
    }
  } catch (error) {
    console.error('Failed to enqueue tasks to SQS:', error);
    return response(500, {
      error: 'Failed to enqueue tasks',
      message: error.message,
      enqueuedCount // Return partial count if some batches succeeded
    });
  }

  // Step 6: Update session phase to AUTOMATION
  try {
    await dynamo.send(new UpdateCommand({
      TableName: process.env.SESSIONS_TABLE_NAME,
      Key: { sessionId },
      UpdateExpression: 'SET currentPhase = :phase, updatedAt = :timestamp',
      ExpressionAttributeValues: {
        ':phase': 'AUTOMATION',
        ':timestamp': new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error('Failed to update session phase:', error);
    // Don't fail the request - tasks are already enqueued
    console.warn('Tasks were enqueued successfully but session phase update failed');
  }

  // Return 202 Accepted - work has been accepted but not yet complete
  return response(202, {
    message: 'Automation triggered successfully',
    sessionId,
    batchId,
    enqueuedCount,
    currentPhase: 'AUTOMATION'
  });
};
