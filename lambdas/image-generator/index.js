const { bedrock, s3, sqs, dynamo, response,
        GetCommand, PutCommand, UpdateCommand, PutObjectCommand,
        InvokeModelCommand, ConverseCommand, SendMessageBatchCommand } = require('../../shared');
const { SQSClient, SendMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

// Separate Bedrock client for us-east-1 (Stable Image Core availability)
const bedrockUsEast1 = new BedrockRuntimeClient({ region: 'us-east-1' });


exports.handler = async (event) => {
  try {
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


    // 3. Generate image using Nova Canvas in us-east-1
    const genRes = await bedrockUsEast1.send(new InvokeModelCommand({
      modelId: 'amazon.nova-canvas-v1:0',
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: prompt,
          negativeText: style.descriptors?.negativePrompt || 'blurry, low quality, distorted'
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          height: 1024,
          width: 1024,
          cfgScale: 8.0,
          seed: Math.floor(Math.random() * 858993459)
        }
      }),
      contentType: 'application/json',
      accept: 'application/json'
    }));
    const genBody = JSON.parse(Buffer.from(genRes.body).toString());
    
    // Nova Canvas returns base64 images array
    if (genBody.error) {
      throw new Error(`Nova Canvas error: ${genBody.error}`);
    }
    const imageBase64 = genBody.images[0];
    const imageBuffer = Buffer.from(imageBase64, 'base64');


    // 4. Score style consistency using Nova Lite (50x cheaper than Claude)
    let styleScore = 85; // default score if scoring fails
    try {
      const scoreRes = await bedrock.send(new ConverseCommand({
        modelId: 'apac.amazon.nova-lite-v1:0',
        messages: [{
          role: 'user',
          content: [
            { image: { format: 'png', source: { bytes: imageBuffer } } },
            { text: `Score this image's style consistency vs these descriptors: ${JSON.stringify(style.descriptors)}. Return only a JSON object: {"score": <0-100>}` }
          ]
        }],
        inferenceConfig: { maxTokens: 256, temperature: 0.1 }
      }));
      
      // Parse score from converse response
      const scoreText = scoreRes.output.message.content[0].text;
      const scoreData = JSON.parse(scoreText.replace(/```json|```/g, '').trim());
      styleScore = scoreData.score || 85;
    } catch (scoreErr) {
      console.warn('Style scoring failed, using default score:', scoreErr.message);
      // Continue with default score - do not block image save
    }
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
    const assetId = crypto.randomUUID();
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
  } catch (error) {
    console.error('Lambda error:', JSON.stringify({
      message: error.message,
      stack: error.stack,
      event: JSON.stringify(event).substring(0, 500)
    }));
    
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
