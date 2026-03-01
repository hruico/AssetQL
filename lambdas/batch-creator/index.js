const { v4: uuidv4 } = require('uuid');
const { dynamo, sqs, response, PutCommand, UpdateCommand, SendMessageBatchCommand, GetCommand } = require('../../shared');


exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { styleProfileId, csvRows, template, config, batchName } = JSON.parse(event.body);
  // csvRows is an array of objects parsed from the uploaded CSV
  // template is a string like: 'A {style} illustration of {subject} in {environment}'
  // config has: { width, height, steps, cfgScale, concurrency }


  const batchId = uuidv4();
  const totalTasks = csvRows.length;
 // 1. Fetch style profile to get descriptors
  const styleRes = await dynamo.send(new GetCommand({ TableName: process.env.STYLES_TABLE_NAME, Key: { styleProfileId } }));
  const style = styleRes.Item;


  const tasks = csvRows.map(row => {
    // Replace {variable} placeholders with CSV column values
    let prompt = template.replace(/\{(\w+)\}/g, (_, key) => row[key] || '');
    // Append style modifiers from the style profile
    prompt += `, ${style.descriptors.artStyle}, ${style.descriptors.mood} atmosphere`;
    prompt += `, colors: ${style.descriptors.colorPalette.join(', ')}`;
    return { taskId: uuidv4(), prompt, metadata: row };
  });


  
  await dynamo.send(new PutCommand({
    TableName: process.env.BATCHES_TABLE_NAME,
    Item: { batchId, userId, name: batchName, status: 'queued', totalTasks,
            completedTasks: 0, failedTasks: 0, styleProfileId, config, createdAt: Date.now() }
  }));


  // 4. Insert all task records and push to SQS in batches of 10
  for (let i = 0; i < tasks.length; i += 10) {
    const chunk = tasks.slice(i, i + 10);


    // Insert task records to DynamoDB
    await Promise.all(chunk.map(task => dynamo.send(new PutCommand({
      TableName: process.env.TASKS_TABLE_NAME,
      Item: { taskId: task.taskId, batchId, status: 'queued', prompt: task.prompt,
              metadata: task.metadata, retryCount: 0, createdAt: Date.now() }
    }))));


    // Push to SQS queue
    await sqs.send(new SendMessageBatchCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      Entries: chunk.map(task => ({
        Id: task.taskId,
        MessageBody: JSON.stringify({ batchId, taskId: task.taskId,
          prompt: task.prompt, styleProfileId, config, retryCount: 0 })
      }))
    }));
  }


  return response(201, { batchId, totalTasks, message: 'Batch created successfully' });
};
