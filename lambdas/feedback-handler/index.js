const { dynamo, bedrockAgentRuntime, PutCommand, InvokeAgentCommand, response } = require('../../shared');
const { v4: uuidv4 } = require('uuid');

/**
 * Feedback Handler Lambda
 * 
 * Triggered by: API Gateway POST /api/v1/feedback
 * Purpose: Bridge between user feedback input and Bedrock Agent reasoning cycle
 * 
 * Flow:
 * 1. Validate and extract feedback from request
 * 2. Write feedback record to DynamoDB
 * 3. Invoke PromptEngineerAgent to process feedback and refine master prompt
 * 4. Return agent response to frontend
 */
exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  
  // Parse and validate request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return response(400, { error: 'Invalid JSON in request body' });
  }

  const { 
    sessionId, 
    feedbackText, 
    feedbackScope = 'global',
    assetId 
  } = body;

  // Validate required fields
  if (!sessionId || !feedbackText) {
    return response(400, { 
      error: 'Missing required fields',
      message: 'sessionId and feedbackText are required'
    });
  }

  // Validate feedbackScope
  if (feedbackScope !== 'global' && feedbackScope !== 'asset-specific') {
    return response(400, {
      error: 'Invalid feedbackScope',
      message: 'feedbackScope must be either "global" or "asset-specific"'
    });
  }

  // Generate feedback ID
  const feedbackId = uuidv4();
  const iterationNumber = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const createdAt = new Date().toISOString();

  // Step 1: Write feedback record to DynamoDB
  const feedbackItem = {
    sessionId,
    iterationNumber,
    feedbackId,
    rawFeedbackText: feedbackText,
    feedbackScope,
    weightScore: 1,
    createdAt
  };

  // Only include assetId if provided
  if (assetId) {
    feedbackItem.assetId = assetId;
  }

  try {
    await dynamo.send(new PutCommand({
      TableName: process.env.FEEDBACK_TABLE_NAME,
      Item: feedbackItem
    }));
  } catch (error) {
    console.error('Failed to write feedback to DynamoDB:', error);
    return response(500, {
      error: 'Failed to save feedback',
      message: error.message
    });
  }

  // Step 2: Invoke PromptEngineerAgent
  let agentResponse = '';
  let agentInvocationSuccess = true;

  try {
    const inputText = `The user has provided feedback for session ${sessionId}: ${feedbackText}. Scope: ${feedbackScope}. Please retrieve the feedback ledger for this session and refine the master prompt accordingly.`;

    const invokeAgentResponse = await bedrockAgentRuntime.send(new InvokeAgentCommand({
      agentId: process.env.PROMPT_ENGINEER_AGENT_ID,
      agentAliasId: process.env.PROMPT_ENGINEER_ALIAS_ID,
      sessionId: sessionId,
      inputText: inputText
    }));

    // Collect streamed response from Agent
    // The Agent may take several seconds to reason through its action groups
    for await (const chunk of invokeAgentResponse.completion) {
      if (chunk.chunk && chunk.chunk.bytes) {
        const text = new TextDecoder().decode(chunk.chunk.bytes);
        agentResponse += text;
      }
    }

  } catch (error) {
    console.error('Failed to invoke PromptEngineerAgent:', error);
    agentInvocationSuccess = false;
    agentResponse = `Agent invocation failed: ${error.message}`;
  }

  // Return response based on success status
  if (agentInvocationSuccess) {
    return response(200, {
      sessionId,
      feedbackId,
      message: 'Feedback processed successfully',
      agentResponse
    });
  } else {
    // Partial success: feedback saved but agent invocation failed
    return response(207, {
      sessionId,
      feedbackId,
      message: 'Feedback saved but agent refinement failed',
      agentResponse,
      warning: 'The feedback was recorded in the database, but the PromptEngineerAgent could not process it. You may need to retry or check agent configuration.'
    });
  }
};
