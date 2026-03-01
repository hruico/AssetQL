resource "aws_s3_bucket" "assets" {
  bucket = "${var.project_name}-assets-${var.environment}"
}


# Block all public access - assets served only through CloudFront
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


# Enable versioning for asset recovery
resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration { status = "Enabled" }
}


# Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    bucket_key_enabled = true
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Lambda permission for S3 to invoke asset-tagger
resource "aws_lambda_permission" "asset_tagger_s3" {
  statement_id  = "AllowS3InvokeAssetTagger"
  action        = "lambda:InvokeFunction"
  function_name = var.asset_tagger_arn
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.assets.arn
}

# S3 Event Notification to trigger asset-tagger
resource "aws_s3_bucket_notification" "asset_uploads" {
  bucket = aws_s3_bucket.assets.id

  lambda_function {
    lambda_function_arn = var.asset_tagger_arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "raw/"  # Only trigger for images in raw/ folder
    filter_suffix       = ".png"  # Only trigger for PNG files
  }

  depends_on = [aws_lambda_permission.asset_tagger_s3]
}
