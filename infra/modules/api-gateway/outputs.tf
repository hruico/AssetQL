# API Gateway outputs

output "api_base_url" {
  description = "Base URL for the API Gateway including the stage"
  value       = "https://${aws_api_gateway_rest_api.assetql_api.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/dev/api/v1"
}

output "rest_api_id" {
  description = "ID of the REST API"
  value       = aws_api_gateway_rest_api.assetql_api.id
}

output "rest_api_execution_arn" {
  description = "Execution ARN of the REST API"
  value       = aws_api_gateway_rest_api.assetql_api.execution_arn
}

output "stage_name" {
  description = "Name of the deployment stage"
  value       = aws_api_gateway_stage.dev.stage_name
}
