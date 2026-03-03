const { dynamo, sqs, response, PutCommand, UpdateCommand, SendMessageBatchCommand, GetCommand, QueryCommand } = require('../../shared');
const crypto = require('crypto');

// Smart template generation based on CSV column names
function generateSmartTemplate(columns) {
  // Common column name patterns and their prompt templates
  const patterns = {
    // Product/Item patterns
    item: ['item', 'item_name', 'itemname', 'product', 'product_name', 'productname', 'name', 'object'],
    category: ['category', 'type', 'item_type', 'product_type'],
    description: ['description', 'desc', 'details'],
    color: ['color', 'colour', 'primary_color'],
    material: ['material', 'texture', 'surface'],
    environment: ['environment', 'setting', 'background', 'scene', 'location'],
    
    // Character patterns
    character: ['character', 'character_name', 'person', 'subject'],
    pose: ['pose', 'action', 'activity', 'stance'],
    emotion: ['emotion', 'mood', 'expression', 'feeling'],
    outfit: ['outfit', 'clothing', 'attire', 'costume'],
    
    // General attributes
    style: ['style', 'art_style', 'visual_style'],
    angle: ['angle', 'view', 'perspective', 'camera_angle'],
    lighting: ['lighting', 'light', 'illumination']
  };
  
  // Normalize column names for matching
  const normalizedColumns = columns.map(col => col.toLowerCase().replace(/[_\s-]/g, ''));
  
  // Detect which pattern categories are present
  const detected = {};
  for (const [key, variations] of Object.entries(patterns)) {
    const match = columns.find((col, idx) => 
      variations.some(v => normalizedColumns[idx].includes(v.replace(/[_\s-]/g, '')))
    );
    if (match) detected[key] = match;
  }
  
  // Build intelligent prompt based on detected columns
  let template = 'A high-quality';
  
  // Add style if present
  if (detected.style) {
    template += ' {' + detected.style + '}';
  }
  
  // Core subject (item, character, or product)
  if (detected.item) {
    template += ' product photo of {' + detected.item + '}';
  } else if (detected.character) {
    template += ' illustration of {' + detected.character + '}';
  } else {
    // Use first column as main subject
    template += ' image of {' + columns[0] + '}';
  }
  
  // Add descriptive attributes
  if (detected.color) {
    template += ' in {' + detected.color + '}';
  }
  
  if (detected.material) {
    template += ' with {' + detected.material + '} texture';
  }
  
  if (detected.pose) {
    template += ' in {' + detected.pose + '} pose';
  }
  
  if (detected.outfit) {
    template += ' wearing {' + detected.outfit + '}';
  }
  
  if (detected.emotion) {
    template += ' with {' + detected.emotion + '} expression';
  }
  
  // Add environment/setting
  if (detected.environment) {
    template += ', set in {' + detected.environment + '}';
  }
  
  // Add camera/technical details
  if (detected.angle) {
    template += ', {' + detected.angle + '} view';
  }
  
  if (detected.lighting) {
    template += ', {' + detected.lighting + '} lighting';
  }
  
  // Add category context if available
  if (detected.category) {
    template += ', {' + detected.category + '} style';
  }
  
  // Professional quality suffix
  template += ', professional photography, detailed, sharp focus';
  
  return template;
}



exports.handler = async (event) => {
  try {
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    // Route GET to getBatch handler
    if (httpMethod === 'GET' && pathParameters.batchId) {
      return await getBatch(event);
    }

    // All other requests = POST (create batch)
    return await createBatch(event);
  } catch (err) {
    console.error('Lambda error:', JSON.stringify({
      message: err.message,
      stack: err.stack,
      event: JSON.stringify(event).substring(0, 500)
    }));
    
    return response(500, { error: err.message });
  }
};

async function createBatch(event) {
  const userId = event.requestContext.authorizer.claims.sub;
  const { styleProfileId, csvRows, template, config, batchName, phase = 'test', parentBatchId } = JSON.parse(event.body);
  // csvRows is an array of objects parsed from the uploaded CSV
  // template is optional - if not provided, auto-generates from CSV columns
  // config has: { width, height, steps, cfgScale, concurrency }
  // phase: 'test' (default) or 'full' - determines if this is a test batch or full batch
  // parentBatchId: optional, links full batch to its test batch

  // Validate required fields
  if (!styleProfileId) return response(400, { error: 'styleProfileId is required' });
  if (!csvRows || !Array.isArray(csvRows) || csvRows.length === 0) {
    return response(400, { error: 'csvRows must be a non-empty array' });
  }

  const batchId = crypto.randomUUID();
  
  // Calculate which rows to process based on phase
  let rowsToProcess = csvRows;
  if (phase === 'test') {
    // Test batch: 10% of total, minimum 10 items, or 30% if less than 10 items
    const totalRows = csvRows.length;
    let testBatchSize;
    
    if (totalRows >= 100) {
      // 10% for large batches (100+ items)
      testBatchSize = Math.ceil(totalRows * 0.1);
    } else if (totalRows >= 10) {
      // At least 10 items for medium batches
      testBatchSize = Math.max(10, Math.ceil(totalRows * 0.1));
    } else {
      // 30% for small batches (less than 10 items)
      testBatchSize = Math.max(1, Math.ceil(totalRows * 0.3));
    }
    
    rowsToProcess = csvRows.slice(0, testBatchSize);
  }
  
  const totalTasks = rowsToProcess.length;
  
  // Auto-generate template if not provided
  let finalTemplate = template;
  if (!finalTemplate) {
    const columns = Object.keys(csvRows[0]);
    finalTemplate = generateSmartTemplate(columns);
  }
 // 1. Fetch style profile to get descriptors
  const styleRes = await dynamo.send(new GetCommand({ TableName: process.env.STYLES_TABLE_NAME, Key: { styleProfileId } }));
  const style = styleRes.Item;
  if (!style) return response(404, { error: `Style profile ${styleProfileId} not found` });


  const tasks = rowsToProcess.map(row => {
    // Replace {variable} placeholders with CSV column values
    let prompt = finalTemplate.replace(/\{(\w+)\}/g, (_, key) => row[key] || '');
    // Append style modifiers from the style profile
    prompt += `, ${style.descriptors?.artStyle || ''}, ${style.descriptors?.mood || ''} atmosphere`;
    prompt += `, colors: ${(style.descriptors?.colorPalette || []).join(', ')}`;
    return { taskId: crypto.randomUUID(), prompt, metadata: row };
  });


  
  const batchItem = {
    batchId,
    userId,
    name: batchName,
    status: 'queued',
    totalTasks,
    completedTasks: 0,
    failedTasks: 0,
    styleProfileId,
    config,
    phase,
    template: finalTemplate,
    createdAt: Date.now()
  };
  
  // Add parentBatchId if this is a full batch
  if (parentBatchId) {
    batchItem.parentBatchId = parentBatchId;
  }
  
  // Add totalCsvRows if this is a test batch (to track full batch size)
  if (phase === 'test') {
    batchItem.totalCsvRows = csvRows.length;
  }
  
  await dynamo.send(new PutCommand({
    TableName: process.env.BATCHES_TABLE_NAME,
    Item: batchItem
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


  return response(201, { 
    batchId, 
    totalTasks, 
    phase,
    template: finalTemplate,
    totalCsvRows: phase === 'test' ? csvRows.length : undefined,
    message: `${phase === 'test' ? 'Test' : 'Full'} batch created successfully` 
  });
}

async function getBatch(event) {
  const userId = event.requestContext.authorizer.claims.sub;
  const { batchId } = event.pathParameters;

  // Fetch batch record
  const batchRes = await dynamo.send(new GetCommand({
    TableName: process.env.BATCHES_TABLE_NAME,
    Key: { batchId }
  }));

  if (!batchRes.Item) {
    return response(404, { error: 'Batch not found' });
  }

  // Verify ownership
  if (batchRes.Item.userId !== userId) {
    return response(403, { error: 'Forbidden' });
  }

  // Fetch tasks for this batch
  const tasksRes = await dynamo.send(new QueryCommand({
    TableName: process.env.TASKS_TABLE_NAME,
    IndexName: 'batchId-status-index',
    KeyConditionExpression: 'batchId = :batchId',
    ExpressionAttributeValues: { ':batchId': batchId }
  }));

  return response(200, {
    batch: batchRes.Item,
    tasks: tasksRes.Items || []
  });
}
