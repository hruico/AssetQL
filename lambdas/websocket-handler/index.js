const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { dynamo, PutCommand, DeleteCommand, QueryCommand } = require('../../shared');


exports.handler = async (event) => {
  // Guard: Ensure requestContext exists before destructuring
  if (!event.requestContext) {
    console.error('Missing requestContext in event:', JSON.stringify(event));
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid WebSocket event' }) };
  }

  const { routeKey, connectionId, domainName, stage } = event.requestContext;
  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`
  });


  if (routeKey === '$connect') {
    // Store connection in DynamoDB when browser connects
    const userId = event.queryStringParameters?.userId;
    await dynamo.send(new PutCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      Item: { connectionId, userId, connectedAt: Date.now() }
    }));
    return { statusCode: 200 };
  }


  if (routeKey === '$disconnect') {
    await dynamo.send(new DeleteCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      Key: { connectionId }
    }));
    return { statusCode: 200 };
  }


  // Handle 'broadcast' action - send update to all connections for a user
  if (routeKey === '$default') {
    const body = JSON.parse(event.body);
    // This is called by BatchProgressFunction when a batch updates
    const connections = await dynamo.send(new QueryCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': body.userId }
    }));
    await Promise.all(connections.Items.map(conn =>
      apiClient.send(new PostToConnectionCommand({
        ConnectionId: conn.connectionId,
        Data: JSON.stringify(body.message)
      })).catch(() => {})  // ignore stale connections
    ));
    return { statusCode: 200 };
  }
};
