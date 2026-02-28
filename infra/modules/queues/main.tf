# Dead Letter Queue - receives failed jobs after 3 retries
resource "aws_sqs_queue" "generation_dlq" {
  name                       = "AssetQL-generation-dlq"
  message_retention_seconds  = 345600  # 14 days
}


# Main generation queue - holds all pending image jobs
resource "aws_sqs_queue" "generation" {
  name                       = "AssetQL-generation-queue"
  visibility_timeout_seconds = 300  # 5 minutes per job
  message_retention_seconds  = 345600
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.generation_dlq.arn
    maxReceiveCount     = 3  # Retry 3 times before sending to DLQ
  })
}
