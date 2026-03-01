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
  default     = "AssetQL-styles"
}

variable "feedback_table_name" {
  type        = string
  description = "Name of the DynamoDB table for feedback history"
  default     = "AssetQL-feedback"
}

variable "sessions_table_name" {
  type        = string
  description = "Name of the DynamoDB table for user sessions"
  default     = "AssetQL-sessions"
}

variable "batches_table_name" {
  type        = string
  description = "Name of the DynamoDB table for batch jobs"
  default     = "AssetQL-batches"
}

variable "assets_table_name" {
  type        = string
  description = "Name of the DynamoDB table for generated assets"
  default     = "AssetQL-assets"
}

variable "tasks_table_name" {
  type        = string
  description = "Name of the DynamoDB table for individual tasks"
  default     = "AssetQL-tasks"
}

variable "connections_table_name" {
  type        = string
  description = "Name of the DynamoDB table for WebSocket connections"
  default     = "AssetQL-connections"
}

variable "sqs_queue_url" {
  type        = string
  description = "URL of the SQS queue for image generation tasks"
}

variable "sqs_queue_arn" {
  type        = string
  description = "ARN of the SQS queue for image generation tasks — used in IAM policies"
}
