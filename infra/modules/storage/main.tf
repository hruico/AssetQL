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

# NOTE: S3 event notifications for asset-tagger moved to lambdas_core module
# to avoid circular dependency (storage → lambdas_core → storage)
