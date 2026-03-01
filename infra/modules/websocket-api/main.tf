# WebSocket API Gateway
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "AssetQL-WebSocket-${var.environment}"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

# $connect route
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}

resource "aws_apigatewayv2_integration" "connect" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.websocket_handler_invoke_arn
}

# $disconnect route
resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect.id}"
}

resource "aws_apigatewayv2_integration" "disconnect" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.websocket_handler_invoke_arn
}

# $default route
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.default.id}"
}

resource "aws_apigatewayv2_integration" "default" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.websocket_handler_invoke_arn
}

# Deployment
resource "aws_apigatewayv2_deployment" "websocket" {
  api_id = aws_apigatewayv2_api.websocket.id

  depends_on = [
    aws_apigatewayv2_route.connect,
    aws_apigatewayv2_route.disconnect,
    aws_apigatewayv2_route.default
  ]

  lifecycle {
    create_before_destroy = true
  }
}

# Stage
resource "aws_apigatewayv2_stage" "websocket" {
  api_id        = aws_apigatewayv2_api.websocket.id
  name          = var.environment
  deployment_id = aws_apigatewayv2_deployment.websocket.id
  
  default_route_settings {
    throttling_burst_limit = 500
    throttling_rate_limit  = 1000
  }
}

# Lambda permissions
resource "aws_lambda_permission" "websocket_connect" {
  statement_id  = "AllowWebSocketAPIInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.websocket_handler_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}
