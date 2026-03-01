const { dynamo, QueryCommand } = require('../../shared');

exports.handler = async (event) => {
  console.log('Bedrock Agent Action Group Event:', JSON.stringify(event, null, 2));

  const { actionGroup, function: functionName, parameters } = event;

  // Extract sessionId from parameters array
  const sessionIdParam = parameters.find(p => p.name === 'sessionId');
  const sessionId = sessionIdParam ? sessionIdParam.value : null;

  if (!sessionId) {
    return {
      messageVersion: '1.0',
      response: {
        actionGroup,
        function: functionName,
        functionResponse: {
          responseBody: {
            'TEXT': {
              body: JSON.stringify({ error: 'sessionId parameter is required' })
            }
          }
        }
      }
    };
  }

  try {
    // Correct approach - two queries, two sources of truth
    const feedbackResult = await dynamo.send(new QueryCommand({
      TableName: process.env.FEEDBACK_TABLE_NAME,
      KeyConditionExpression: 'sessionId = :sid',
      ExpressionAttributeValues: { ':sid': sessionId },
      ScanIndexForward: true  // ascending by iterationNumber (explicit is better)
    }));

    const sessionResult = await dynamo.send(new GetCommand({
      TableName: process.env.SESSIONS_TABLE_NAME,
      Key: { sessionId }
    }));

    const session = sessionResult.Item || {};

    const responseData = {
      feedbackHistory: feedbackResult.Items || [],
      lockedElements: session.lockedStyleElements || [],  // from Sessions, not feedback
      activeRefinements: session.activeRefinements || []   // from Sessions, not feedback
    };

    // Return in Bedrock Agent response format
    return {
      messageVersion: '1.0',
      response: {
        actionGroup,
        function: functionName,
        functionResponse: {
          responseBody: {
            'TEXT': {
              body: JSON.stringify(responseData)
            }
          }
        }
      }
    };

  } catch (error) {
    console.error('Error querying feedback:', error);
    return {
      messageVersion: '1.0',
      response: {
        actionGroup,
        function: functionName,
        functionResponse: {
          responseBody: {
            'TEXT': {
              body: JSON.stringify({ error: error.message })
            }
          }
        }
      }
    };
  }
};
