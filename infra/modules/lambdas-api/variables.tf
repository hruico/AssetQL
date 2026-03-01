variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"
}

variable "feedback_table_name" {
  type        = string
  description = "Name of the DynamoDB table for feedback history"
}

variable "sessions_table_name" {
  type        = string
  description = "Name of the DynamoDB table for user sessions"
}

variable "lambda_execution_role_arn" {
  type        = string
  description = "ARN of the shared Lambda execution IAM role from lambdas-core module"
}

variable "lambda_execution_role_name" {
  type        = string
  description = "Name of the shared Lambda execution IAM role for attaching policies"
}

variable "prompt_engineer_agent_id" {
  type        = string
  description = "ID of the PromptEngineer Bedrock Agent for feedback processing"
}

variable "prompt_engineer_alias_id" {
  type        = string
  description = "Alias ID of the PromptEngineer Bedrock Agent for invocation"
}

variable "common_dependencies_layer_arn" {
  type        = string
  description = "ARN of the common dependencies Lambda Layer"
}
