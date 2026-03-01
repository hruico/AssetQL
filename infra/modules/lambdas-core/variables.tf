variable "assets_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for storing assets"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"
}

variable "styles_table_name" {
  type        = string
  description = "Name of the DynamoDB table for style profiles"
}

variable "feedback_table_name" {
  type        = string
  description = "Name of the DynamoDB table for feedback history"
}

variable "sessions_table_name" {
  type        = string
  description = "Name of the DynamoDB table for user sessions"
}

variable "sqs_queue_url" {
  type        = string
  description = "URL of the SQS queue for image generation tasks"
}

variable "sqs_queue_arn" {
  type        = string
  description = "ARN of the SQS queue for image generation tasks — used in IAM policies"
}

variable "tasks_table_name" {
  type        = string
  description = "Name of the DynamoDB table for batch tasks"
}
