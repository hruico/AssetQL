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

output "session_manager_arn" {
  description = "ARN of the session-manager Lambda function"
  value       = aws_lambda_function.session_manager.arn
}

output "batch_creator_arn" {
  description = "ARN of the batch-creator Lambda function"
  value       = aws_lambda_function.batch_creator.arn
}

output "automation_trigger_arn" {
  description = "ARN of the automation-trigger Lambda function"
  value       = aws_lambda_function.automation_trigger.arn
}

output "export_handler_arn" {
  description = "ARN of the export-handler Lambda function"
  value       = aws_lambda_function.export_handler.arn
}

output "lambda_execution_role_arn" {
  description = "ARN of the shared Lambda execution IAM role — reused by lambdas-api module"
  value       = aws_iam_role.style_embedding_role.arn
}
