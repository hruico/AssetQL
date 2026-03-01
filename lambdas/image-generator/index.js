const { v4: uuidv4 } = require('uuid');
const { bedrock, s3, sqs, dynamo, response,
        GetCommand, PutCommand, UpdateCommand, PutObjectCommand,
        InvokeModelCommand, SendMessageBatchCommand } = require('../../shared');
const { SQSClient, SendMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');


exports.handler = async (event) => {
  // SQS sends messages in batches - we process one at a time (batchSize: 1)
  const record = event.Records[0];
  const { batchId, taskId, prompt, styleProfileId, config, retryCount } = JSON.parse(record.body);


  // 1. Mark task as 'processing' in DynamoDB
//   await dynamo.send(new UpdateCommand({
//     TableName: 'AssetQL-tasks',
//     Key: { taskId, batchId },
//     UpdateExpression: 'SET #s = :s, processingStartTime = :t',
//     ExpressionAttributeNames: { '#s': 'status' },
//     ExpressionAttributeValues: { ':s': 'processing', ':t': Date.now() }
//   }));

    // Seems unneccesary -> costs extra computation


  // 2. Fetch style profile descriptors
  const styleRes = await dynamo.send(new GetCommand({ TableName: process.env.STYLES_TABLE_NAME, Key: { styleProfileId } }));
  const style = styleRes.Item;
  const negativePrompt = style.descriptors.negativePrompt || 'blurry, low quality, distorted';


  // 3. Call Bedrock Stable Image Core (50% cheaper than SDXL, faster generation)
  const stableCorePayload = {
    prompt: prompt,
    negative_prompt: negativePrompt,
    aspect_ratio: "1:1",  // or "16:9", "9:16", "4:3", "3:4"
    output_format: "png"
  };


  const imgRes = await bedrock.send(new InvokeModelCommand({
    modelId: 'stability.stable-image-core-v1:0',
    body: JSON.stringify(stableCorePayload),
    contentType: 'application/json',
    accept: 'application/json'
  }));
  const imgBody = JSON.parse(Buffer.from(imgRes.body).toString());
  const imageBase64 = imgBody.images[0];
  const imageBuffer = Buffer.from(imageBase64, 'base64');


  // 4. Score style consistency using Nova Lite (50x cheaper than Claude)
  const scoringPayload = {
    messages: [{
      role: 'user',
      content: [
        { image: { format: 'png', source: { bytes: imageBuffer } } },
        { text: `Rate how closely this image matches this style profile on a scale of 0-100.
Style: ${JSON.stringify(style.descriptors)}
Return ONLY a JSON object: {"score": <number>}` }
      ]
    }],
    inferenceConfig: { maxTokens: 100, temperature: 0.3 }
  };
  
  const scoreRes = await bedrock.send(new InvokeModelCommand({
    modelId: 'amazon.nova-lite-v1:0',
    body: JSON.stringify(scoringPayload),
    contentType: 'application/json'
  }));
  const scoreBody = JSON.parse(Buffer.from(scoreRes.body).toString());
  const scoreData = JSON.parse(scoreBody.output.message.content[0].text);
  const styleScore = scoreData.score;
  const threshold = style.deviationThreshold || 85;


  // 5. If style score is too low, retry (up to 3 times)
  if (styleScore < threshold && retryCount < 3) {
    // await dynamo.send(new UpdateCommand({
    //   TableName: 'AssetQL-tasks',
    //   Key: { taskId, batchId },
    //   UpdateExpression: 'SET #s = :s, retryCount = :r',
    //   ExpressionAttributeNames: { '#s': 'status' },
    //   ExpressionAttributeValues: { ':s': 'retrying', ':r': retryCount + 1 }
    // }));
    // above code is unnecessary 
    // Re-queue with incremented retryCount
    const sqsClient = new SQSClient({});
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({ batchId, taskId, prompt, styleProfileId, config, retryCount: retryCount + 1 }),
      DelaySeconds: Math.pow(2, retryCount)  // exponential backoff: 1s, 2s, 4s
    }));
    return;
}


  // 6. Save the generated image to S3
  const assetId = uuidv4();
  const s3Key = `raw/${batchId}/${assetId}.png`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: s3Key,
    Body: imageBuffer,
    ContentType: 'image/png'
  }));


  // 7. Create the asset record in DynamoDB
  await dynamo.send(new PutCommand({
    TableName: process.env.ASSETS_TABLE_NAME,
    Item: { assetId, batchId, userId: 'unknown', s3Key,
            prompt, styleScore, dimensions: { width: config.width || 1024, height: config.height || 1024 },
            createdAt: Date.now(), tags: [], category: 'uncategorized' }
  }));


  // 8. Mark task as completed, increment batch counter
  await dynamo.send(new UpdateCommand({
    TableName: process.env.TASKS_TABLE_NAME,
    Key: { taskId, batchId },
    UpdateExpression: 'SET #s = :s, assetId = :a, processingEndTime = :t',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'completed', ':a': assetId, ':t': Date.now() }
  }));
  await dynamo.send(new UpdateCommand({
    TableName: process.env.BATCHES_TABLE_NAME,
    Key: { batchId },
    UpdateExpression: 'ADD completedTasks :one',
    ExpressionAttributeValues: { ':one': 1 }
  }));
};
