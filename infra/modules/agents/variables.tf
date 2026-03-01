variable "action_get_feedback_ledger_arn" {
  type        = string
  description = "ARN of the action-get-feedback-ledger Lambda function"
}

variable "action_refine_prompt_arn" {
  type        = string
  description = "ARN of the action-refine-prompt Lambda function"
}

variable "image_generator_arn" {
  type        = string
  description = "ARN of the image-generator Lambda function"
}
