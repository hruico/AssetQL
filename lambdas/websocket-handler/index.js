const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { dynamo, PutCommand, DeleteCommand, QueryCommand } = require('../../shared');


exports.handler = async (event) => {
  const { routeKey, connectionId } = event.requestContext;
  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  });


  if (routeKey === '$connect') {
    // Store connection in DynamoDB when browser connects
    const userId = event.queryStringParameters?.userId;
    await dynamo.send(new PutCommand({
      TableName: 'AssetQL-connections',
      Item: { connectionId, userId, connectedAt: Date.now() }
    }));
    return { statusCode: 200 };
  }


  if (routeKey === '$disconnect') {
    await dynamo.send(new DeleteCommand({
      TableName: 'AssetQL-connections',
      Key: { connectionId }
    }));
    return { statusCode: 200 };
  }


  // Handle 'broadcast' action - send update to all connections for a user
  if (routeKey === '$default') {
    const body = JSON.parse(event.body);
    // This is called by BatchProgressFunction when a batch updates
    const connections = await dynamo.send(new QueryCommand({
      TableName: 'AssetQL-connections',
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
