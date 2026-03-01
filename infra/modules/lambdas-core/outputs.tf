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

output "lambda_execution_role_name" {
  description = "Name of the shared Lambda execution IAM role — for attaching policies"
  value       = aws_iam_role.style_embedding_role.name
}

output "asset_tagger_arn" {
  description = "ARN of the asset-tagger Lambda function"
  value       = aws_lambda_function.asset_tagger.arn
}

output "websocket_handler_arn" {
  description = "ARN of the websocket-handler Lambda function"
  value       = aws_lambda_function.websocket_handler.arn
}

output "websocket_handler_invoke_arn" {
  description = "Invoke ARN of the websocket-handler Lambda function"
  value       = aws_lambda_function.websocket_handler.invoke_arn
}

output "export_orchestrator_arn" {
  description = "ARN of the export-orchestrator Lambda function"
  value       = aws_lambda_function.export_orchestrator.arn
}
