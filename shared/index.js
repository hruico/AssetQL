const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { SQSClient, SendMessageBatchCommand } = require('@aws-sdk/client-sqs');
const { BedrockRuntimeClient, InvokeModelCommand, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');


const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const sqs = new SQSClient({});
const bedrock = new BedrockRuntimeClient({ region: 'ap-south-1' });
const bedrockAgentRuntime = new BedrockAgentRuntimeClient({ region: 'ap-south-1' });


// Standard API response format
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token'
    },
    body: JSON.stringify(body)
  };
}

module.exports = { dynamo, s3, sqs, bedrock, bedrockAgentRuntime, response,
  GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand,
  DeleteCommand,PutObjectCommand, GetObjectCommand, SendMessageBatchCommand, InvokeModelCommand, ConverseCommand, InvokeAgentCommand };

