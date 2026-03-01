# Lambda function ARN outputs for use in other modules

output "style_embedding_arn" {
  description = "ARN of the style embedding Lambda function"
  value       = aws_lambda_function.style_embedding.arn
}

output "action_get_feedback_ledger_arn" {
  description = "ARN of the action-get-feedback-ledger Lambda function"
  value       = aws_lambda_function.action_get_feedback_ledger.arn
}

output "action_refine_prompt_arn" {
  description = "ARN of the action-refine-prompt Lambda function"
  value       = aws_lambda_function.action_refine_prompt.arn
}

output "image_generator_arn" {
  description = "ARN of the image-generator Lambda function"
  value       = aws_lambda_function.image_generator.arn
}
