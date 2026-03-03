# Lambda function ARN variables
variable "presign_upload_arn" {
  description = "ARN of the presign-upload Lambda function"
  type        = string
}

variable "session_manager_arn" {
  description = "ARN of the session-manager Lambda function"
  type        = string
}

variable "style_embedding_arn" {
  description = "ARN of the style-embedding Lambda function"
  type        = string
}

variable "batch_creator_arn" {
  description = "ARN of the batch-creator Lambda function"
  type        = string
}

variable "feedback_handler_arn" {
  description = "ARN of the feedback-handler Lambda function (placeholder for future implementation)"
  type        = string
}

variable "automation_trigger_arn" {
  description = "ARN of the automation-trigger Lambda function"
  type        = string
}

variable "export_handler_arn" {
  description = "ARN of the export-handler Lambda function"
  type        = string
}

# Cognito configuration
variable "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool for JWT authorization"
  type        = string
}

# Environment configuration
variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}
