# infra/modules/queues/outputs.tf

output "queue_url" {
  description = "URL of the image generation SQS queue — used by Lambda SDK calls"
  value       = aws_sqs_queue.generation.url  # verify resource name in main.tf
}

output "queue_arn" {
  description = "ARN of the image generation SQS queue — used by IAM policies and event source mappings"
  value       = aws_sqs_queue.generation.arn  # same resource, different attribute
}