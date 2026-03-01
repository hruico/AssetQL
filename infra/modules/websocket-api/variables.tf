variable "environment" {
  type        = string
  description = "Environment name"
}

variable "websocket_handler_arn" {
  type        = string
  description = "ARN of the websocket-handler Lambda function"
}

variable "websocket_handler_invoke_arn" {
  type        = string
  description = "Invoke ARN of the websocket-handler Lambda function"
}
