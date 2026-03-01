# Output table names for use in other modules and Lambda environment variables

output "batches_table_name" {
  description = "Name of the batches DynamoDB table"
  value       = aws_dynamodb_table.batches.name
}

output "assets_table_name" {
  description = "Name of the assets DynamoDB table"
  value       = aws_dynamodb_table.assets.name
}

output "tasks_table_name" {
  description = "Name of the tasks DynamoDB table"
  value       = aws_dynamodb_table.tasks.name
}

output "styles_table_name" {
  description = "Name of the styles DynamoDB table"
  value       = aws_dynamodb_table.styles.name
}

output "connections_table_name" {
  description = "Name of the connections DynamoDB table"
  value       = aws_dynamodb_table.connections.name
}

output "feedback_table_name" {
  description = "Name of the feedback DynamoDB table"
  value       = aws_dynamodb_table.feedback.name
}

output "sessions_table_name" {
  description = "Name of the sessions DynamoDB table"
  value       = aws_dynamodb_table.sessions.name
}

output "tasks_table_stream_arn" {
  description = "ARN of the DynamoDB Streams for tasks table"
  value       = aws_dynamodb_table.tasks.stream_arn
}
