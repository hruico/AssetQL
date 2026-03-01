# infra/modules/storage/outputs.tf

output "assets_bucket_name" {
  description = "Name of the S3 bucket for storing generated assets — used by Lambda environment variables"
  value       = aws_s3_bucket.assets.id  
  # .id on an S3 bucket returns the bucket name, which is what the Lambda SDK needs
}

output "assets_bucket_arn" {
  description = "ARN of the assets S3 bucket — used by IAM policies"
  value       = aws_s3_bucket.assets.arn
}