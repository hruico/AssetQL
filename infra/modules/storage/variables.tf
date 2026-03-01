variable "aws_region" {
  default = "ap-south-1"
}
variable "environment" {
  default = "dev"
}
variable "project_name" {
  default = "assetql"
}

# Removed asset_tagger_arn to break circular dependency
# S3 event notifications will be configured separately
