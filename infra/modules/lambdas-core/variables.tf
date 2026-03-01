variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"
}

variable "common_dependencies_layer_arn" {
  type        = string
  description = "ARN of the common dependencies Lambda Layer"
}

variable "image_processing_layer_arn" {
  type        = string
  description = "ARN of the image processing Lambda Layer"
}

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

variable "batches_table_name" {
  type        = string
  description = "Name of the DynamoDB table for batches"
}

variable "assets_table_name" {
  type        = string
  description = "Name of the DynamoDB table for assets"
}

variable "connections_table_name" {
  type        = string
  description = "Name of the DynamoDB table for WebSocket connections"
}

variable "tasks_table_stream_arn" {
  type        = string
  description = "ARN of the DynamoDB Streams for tasks table"
}
