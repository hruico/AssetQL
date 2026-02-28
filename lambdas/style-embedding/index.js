const { v4: uuidv4 } = require('uuid');
const { bedrock, s3, dynamo, response, PutObjectCommand, PutCommand, InvokeModelCommand } = require('../../shared/index.js');


exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const body = JSON.parse(event.body);
  // body contains: { name, imageBase64, imageType, lockedParams, deviationThreshold }


  const styleProfileId = uuidv4();


  // 1. Save the reference image to S3
  const imageBuffer = Buffer.from(body.imageBase64, 'base64');
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `style-references/${styleProfileId}/reference.${body.imageType}`,
    Body: imageBuffer,
    ContentType: `image/${body.imageType}`
  }));


  // 2. Call Bedrock Claude 3 to analyze the style
  const bedrockPayload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: `image/${body.imageType}`, data: body.imageBase64 } },
        { type: 'text', text: `Analyze the visual style of this image and return ONLY a JSON object (no explanation) with these exact fields:
          {
            "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
            "composition": "description of layout and composition",
            "texture": "description of textures and surface quality",
            "lighting": "description of lighting style and mood",
            "artStyle": "e.g. fantasy illustration, photorealistic, flat cartoon",
            "mood": "1-3 words describing the emotional atmosphere",
            "negativePrompt": "elements to avoid for style consistency"
         }` }
      ]
    }]
  };


  const bedrockRes = await bedrock.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    body: JSON.stringify(bedrockPayload),
    contentType: 'application/json'
  }));
  const styleDescriptors = JSON.parse(JSON.parse(Buffer.from(bedrockRes.body).toString()).content[0].text);


  // 3. Save style profile to DynamoDB
  await dynamo.send(new PutCommand({
    TableName: 'AssetQL-styles',
    Item: {
      styleProfileId, userId,
      name: body.name,
      referenceImageKey: `style-references/${styleProfileId}/reference.${body.imageType}`,
      descriptors: styleDescriptors,
      lockedParams: body.lockedParams || [],
      deviationThreshold: body.deviationThreshold || 85,
      createdAt: Date.now()
    }
  }));


  return response(201, { styleProfileId, descriptors: styleDescriptors });
};
