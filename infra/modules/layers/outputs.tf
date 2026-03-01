output "common_dependencies_layer_arn" {
  description = "ARN of the common dependencies Lambda Layer"
  value       = aws_lambda_layer_version.common_dependencies.arn
}

output "image_processing_layer_arn" {
  description = "ARN of the image processing Lambda Layer"
  value       = aws_lambda_layer_version.image_processing.arn
}
