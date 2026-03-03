const sharp = require('sharp');  // Image processing library
const { bedrock, s3, dynamo, GetObjectCommand, PutObjectCommand, UpdateCommand, ConverseCommand } = require('../../shared');


exports.handler = async (event) => {
  const s3Record = event.Records[0].s3;
  const s3Key = decodeURIComponent(s3Record.object.key);
  // key format: raw/{batchId}/{assetId}.png
  const parts = s3Key.split('/');
  const assetId = parts[2].replace('.png', '');


  // 1. Download the image from S3
  const s3Res = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: s3Key }));
  const imageBuffer = Buffer.concat(await s3Res.Body.toArray());


  // 2. Ask Bedrock Nova Lite to tag the image (50x cheaper than Claude)
  const tagRes = await bedrock.send(new ConverseCommand({
    modelId: 'apac.amazon.nova-lite-v1:0',
    messages: [{
      role: 'user',
      content: [
        { image: { format: 'png', source: { bytes: imageBuffer } } },
        { text: `Analyze this image and return ONLY a JSON object (no explanation) with these exact fields:
{
  "objects": ["object1", "object2", "object3"],
  "scene": "description of the scene",
  "colors": ["color1", "color2", "color3"],
  "mood": "mood description",
  "style": "art style description",
  "composition": "composition description",
  "category": "main category (e.g., character, landscape, product, abstract)"
}` }
      ]
    }],
    inferenceConfig: { maxTokens: 512, temperature: 0.3 }
  }));
  const tagText = tagRes.output.message.content[0].text;
  const tagData = JSON.parse(tagText.replace(/```json|```/g, '').trim());
  
  // Flatten all fields into a single tags array
  const tags = [
    ...tagData.objects,
    tagData.scene,
    ...tagData.colors,
    tagData.mood,
    tagData.style,
    tagData.composition
  ].filter(Boolean);


  // 3. Generate a 256x256 thumbnail using Sharp
  const thumbnailBuffer = await sharp(imageBuffer).resize(256, 256, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  const thumbnailKey = `thumbnails/${assetId}_thumb.jpg`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: thumbnailKey,
    Body: thumbnailBuffer,
    ContentType: 'image/jpeg'
  }));


  // 4. Update asset record in DynamoDB with tags and thumbnail
  await dynamo.send(new UpdateCommand({
    TableName: process.env.ASSETS_TABLE_NAME,
    Key: { assetId },
    UpdateExpression: 'SET tags = :tags, category = :cat, thumbnailKey = :thumb',
    ExpressionAttributeValues: { ':tags': tags, ':cat': tagData.category, ':thumb': thumbnailKey }
  }));
  console.log(`Tagged asset ${assetId} with ${tags.length} tags`);
};
