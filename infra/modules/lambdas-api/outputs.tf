# Lambda function ARN outputs for use in other modules

output "feedback_handler_arn" {
  description = "ARN of the feedback-handler Lambda function"
  value       = aws_lambda_function.feedback_handler.arn
}
