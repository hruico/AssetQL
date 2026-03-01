const sharp = require('sharp');
const archiver = require('archiver');  // ZIP creation library
const { PassThrough } = require('stream');
const { v4: uuidv4 } = require('uuid');
const { s3, dynamo, GetObjectCommand, PutObjectCommand, QueryCommand, response } = require('../../shared');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');


const PLATFORM_SIZES = {
  'unity':     [{ name: 'original', width: null, height: null, format: 'png' }],
  'shopify':   [{ name: 'large', width: 1024, height: 1024, format: 'jpeg' },
                { name: 'medium', width: 512, height: 512, format: 'jpeg' },
                { name: 'thumb', width: 256, height: 256, format: 'jpeg' }],
  'instagram': [{ name: 'square', width: 1080, height: 1080, format: 'jpeg' },
                { name: 'portrait', width: 1080, height: 1350, format: 'jpeg' }],
  'facebook':  [{ name: 'post', width: 1200, height: 630, format: 'jpeg' }],
  'twitter':   [{ name: 'post', width: 1200, height: 675, format: 'jpeg' }],
};


exports.handler = async (event) => {
  const { assetIds, platform } = JSON.parse(event.body);
  const exportId = uuidv4();
  const sizes = PLATFORM_SIZES[platform] || PLATFORM_SIZES['unity'];
  // Build a ZIP in memory and stream it to S3
  const passThrough = new PassThrough();
  const archive = archiver('zip');
  archive.pipe(passThrough);
  // Fetch and process each asset
  for (const assetId of assetIds) {
    const assetRes = await dynamo.send(new GetCommand({ TableName: process.env.ASSETS_TABLE_NAME, Key: { assetId } }));
    const asset = assetRes.Item;
    const s3Res = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: asset.s3Key }));
    const imgBuffer = Buffer.concat(await s3Res.Body.toArray());
   for (const size of sizes) {
      let processedBuffer = imgBuffer;
      if (size.width) {
        processedBuffer = await sharp(imgBuffer).resize(size.width, size.height, { fit: 'cover' })
          [size.format]({ quality: 85 }).toBuffer();
      }
      archive.append(processedBuffer, { name: `${platform}/${size.name}/${assetId}.${size.format}` });
    }
  }
  archive.finalize();
  // Upload ZIP to S3
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET, Key: `exports/${exportId}.zip`,
    Body: passThrough, ContentType: 'application/zip'
  }));
  // Generate a signed download URL (expires in 7 days)
  const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: process.env.S3_BUCKET, Key: `exports/${exportId}.zip` }), { expiresIn: 604800 });
  return response(200, { exportId, downloadUrl, expiresAt: Date.now() + 604800000 });
};
