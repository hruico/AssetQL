# Data source for current AWS region
data "aws_region" "current" {}

# REST API Gateway
resource "aws_api_gateway_rest_api" "assetql_api" {
  name        = "AssetQL-API-${var.environment}"
  description = "AssetQL REST API for asset generation and management"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Cognito Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "AssetQL-CognitoAuthorizer"
  rest_api_id     = aws_api_gateway_rest_api.assetql_api.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}

# /api resource - first level of path hierarchy
resource "aws_api_gateway_resource" "api_root" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_rest_api.assetql_api.root_resource_id
  path_part   = "api"
}

# /api/v1 resource - second level of path hierarchy, parent for all API endpoints
resource "aws_api_gateway_resource" "api_v1" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.api_root.id
  path_part   = "v1"
}

# /sessions resource
resource "aws_api_gateway_resource" "sessions" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "sessions"
}

# /sessions/{sessionId} resource
resource "aws_api_gateway_resource" "sessions_id" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.sessions.id
  path_part   = "{sessionId}"
}

# /sessions/{sessionId}/phase resource
resource "aws_api_gateway_resource" "sessions_phase" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.sessions_id.id
  path_part   = "phase"
}

# /sessions/{sessionId}/automate resource
resource "aws_api_gateway_resource" "sessions_automate" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.sessions_id.id
  path_part   = "automate"
}

# /sessions/{sessionId}/export resource
resource "aws_api_gateway_resource" "sessions_export" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.sessions_id.id
  path_part   = "export"
}

# /styles resource
resource "aws_api_gateway_resource" "styles" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "styles"
}

# /presign resource
resource "aws_api_gateway_resource" "presign" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "presign"
}

# /batches resource
resource "aws_api_gateway_resource" "batches" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "batches"
}

# /feedback resource
resource "aws_api_gateway_resource" "feedback" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "feedback"
}

# /assets resource
resource "aws_api_gateway_resource" "assets" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "assets"
}

# /assets/{assetId} resource
resource "aws_api_gateway_resource" "assets_id" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  parent_id   = aws_api_gateway_resource.assets.id
  path_part   = "{assetId}"
}

# POST /sessions
resource "aws_api_gateway_method" "sessions_post" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "sessions_post" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.sessions.id
  http_method             = aws_api_gateway_method.sessions_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.session_manager_arn}/invocations"
}

# GET /sessions (list all sessions for user)
resource "aws_api_gateway_method" "sessions_list" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "sessions_list" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.sessions.id
  http_method             = aws_api_gateway_method.sessions_list.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.session_manager_arn}/invocations"
}

# GET /sessions/{sessionId}
resource "aws_api_gateway_method" "sessions_get" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "sessions_get" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.sessions_id.id
  http_method             = aws_api_gateway_method.sessions_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.session_manager_arn}/invocations"
}

# PUT /sessions/{sessionId}/phase
resource "aws_api_gateway_method" "sessions_phase_put" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions_phase.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "sessions_phase_put" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.sessions_phase.id
  http_method             = aws_api_gateway_method.sessions_phase_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.session_manager_arn}/invocations"
}

# POST /styles
resource "aws_api_gateway_method" "styles_post" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.styles.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "styles_post" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.styles.id
  http_method             = aws_api_gateway_method.styles_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.style_embedding_arn}/invocations"
}

# GET /styles (list all style profiles for user)
resource "aws_api_gateway_method" "styles_list" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.styles.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "styles_list" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.styles.id
  http_method             = aws_api_gateway_method.styles_list.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.style_embedding_arn}/invocations"
}

# POST /presign
resource "aws_api_gateway_method" "presign_post" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.presign.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "presign_post" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.presign.id
  http_method             = aws_api_gateway_method.presign_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.presign_upload_arn}/invocations"
}

# POST /batches
resource "aws_api_gateway_method" "batches_post" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.batches.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "batches_post" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.batches.id
  http_method             = aws_api_gateway_method.batches_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.batch_creator_arn}/invocations"
}

# POST /feedback
resource "aws_api_gateway_method" "feedback_post" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.feedback.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "feedback_post" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.feedback.id
  http_method             = aws_api_gateway_method.feedback_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.feedback_handler_arn}/invocations"
}

# GET /assets/{assetId} - TODO: Implement in Phase 3
# resource "aws_api_gateway_method" "assets_get" {
#   rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
#   resource_id   = aws_api_gateway_resource.assets_id.id
#   http_method   = "GET"
#   authorization = "COGNITO_USER_POOLS"
#   authorizer_id = aws_api_gateway_authorizer.cognito.id
# }

# resource "aws_api_gateway_integration" "assets_get" {
#   rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
#   resource_id             = aws_api_gateway_resource.assets_id.id
#   http_method             = aws_api_gateway_method.assets_get.http_method
#   integration_http_method = "POST"
#   type                    = "AWS_PROXY"
#   uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.session_manager_arn}/invocations"
# }

# POST /sessions/{sessionId}/automate
resource "aws_api_gateway_method" "sessions_automate_post" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions_automate.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "sessions_automate_post" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.sessions_automate.id
  http_method             = aws_api_gateway_method.sessions_automate_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.automation_trigger_arn}/invocations"
}

# POST /sessions/{sessionId}/export
resource "aws_api_gateway_method" "sessions_export_post" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions_export.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "sessions_export_post" {
  rest_api_id             = aws_api_gateway_rest_api.assetql_api.id
  resource_id             = aws_api_gateway_resource.sessions_export.id
  http_method             = aws_api_gateway_method.sessions_export_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.export_handler_arn}/invocations"
}

# CORS - OPTIONS /sessions
resource "aws_api_gateway_method" "sessions_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sessions_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions.id
  http_method = aws_api_gateway_method.sessions_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "sessions_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions.id
  http_method = aws_api_gateway_method.sessions_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "sessions_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions.id
  http_method = aws_api_gateway_method.sessions_options.http_method
  status_code = aws_api_gateway_method_response.sessions_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# CORS - OPTIONS /sessions/{sessionId}
resource "aws_api_gateway_method" "sessions_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sessions_id_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_id.id
  http_method = aws_api_gateway_method.sessions_id_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "sessions_id_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_id.id
  http_method = aws_api_gateway_method.sessions_id_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "sessions_id_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_id.id
  http_method = aws_api_gateway_method.sessions_id_options.http_method
  status_code = aws_api_gateway_method_response.sessions_id_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# CORS - OPTIONS /sessions/{sessionId}/phase
resource "aws_api_gateway_method" "sessions_phase_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions_phase.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sessions_phase_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_phase.id
  http_method = aws_api_gateway_method.sessions_phase_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "sessions_phase_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_phase.id
  http_method = aws_api_gateway_method.sessions_phase_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "sessions_phase_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_phase.id
  http_method = aws_api_gateway_method.sessions_phase_options.http_method
  status_code = aws_api_gateway_method_response.sessions_phase_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# CORS - OPTIONS /styles
resource "aws_api_gateway_method" "styles_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.styles.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "styles_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.styles.id
  http_method = aws_api_gateway_method.styles_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "styles_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.styles.id
  http_method = aws_api_gateway_method.styles_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "styles_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.styles.id
  http_method = aws_api_gateway_method.styles_options.http_method
  status_code = aws_api_gateway_method_response.styles_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# CORS - OPTIONS /presign
resource "aws_api_gateway_method" "presign_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.presign.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "presign_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.presign.id
  http_method = aws_api_gateway_method.presign_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "presign_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.presign.id
  http_method = aws_api_gateway_method.presign_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "presign_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.presign.id
  http_method = aws_api_gateway_method.presign_options.http_method
  status_code = aws_api_gateway_method_response.presign_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
  }
}

# CORS - OPTIONS /batches
resource "aws_api_gateway_method" "batches_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.batches.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "batches_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.batches.id
  http_method = aws_api_gateway_method.batches_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "batches_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.batches.id
  http_method = aws_api_gateway_method.batches_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "batches_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.batches.id
  http_method = aws_api_gateway_method.batches_options.http_method
  status_code = aws_api_gateway_method_response.batches_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# CORS - OPTIONS /feedback
resource "aws_api_gateway_method" "feedback_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.feedback.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "feedback_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.feedback.id
  http_method = aws_api_gateway_method.feedback_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "feedback_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.feedback.id
  http_method = aws_api_gateway_method.feedback_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "feedback_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.feedback.id
  http_method = aws_api_gateway_method.feedback_options.http_method
  status_code = aws_api_gateway_method_response.feedback_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# CORS - OPTIONS /assets/{assetId} - TODO: Implement in Phase 3
# resource "aws_api_gateway_method" "assets_options" {
#   rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
#   resource_id   = aws_api_gateway_resource.assets_id.id
#   http_method   = "OPTIONS"
#   authorization = "NONE"
# }

# resource "aws_api_gateway_integration" "assets_options" {
#   rest_api_id = aws_api_gateway_rest_api.assetql_api.id
#   resource_id = aws_api_gateway_resource.assets_id.id
#   http_method = aws_api_gateway_method.assets_options.http_method
#   type        = "MOCK"

#   request_templates = {
#     "application/json" = "{\"statusCode\": 200}"
#   }
# }

# resource "aws_api_gateway_method_response" "assets_options" {
#   rest_api_id = aws_api_gateway_rest_api.assetql_api.id
#   resource_id = aws_api_gateway_resource.assets_id.id
#   http_method = aws_api_gateway_method.assets_options.http_method
#   status_code = "200"

#   response_parameters = {
#     "method.response.header.Access-Control-Allow-Origin"  = true
#     "method.response.header.Access-Control-Allow-Headers" = true
#     "method.response.header.Access-Control-Allow-Methods" = true
#   }
# }

# resource "aws_api_gateway_integration_response" "assets_options" {
#   rest_api_id = aws_api_gateway_rest_api.assetql_api.id
#   resource_id = aws_api_gateway_resource.assets_id.id
#   http_method = aws_api_gateway_method.assets_options.http_method
#   status_code = aws_api_gateway_method_response.assets_options.status_code

#   response_parameters = {
#     "method.response.header.Access-Control-Allow-Origin"  = "'*'"
#     "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
#     "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
#   }
# }

# CORS - OPTIONS /sessions/{sessionId}/automate
resource "aws_api_gateway_method" "sessions_automate_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions_automate.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sessions_automate_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_automate.id
  http_method = aws_api_gateway_method.sessions_automate_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "sessions_automate_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_automate.id
  http_method = aws_api_gateway_method.sessions_automate_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "sessions_automate_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_automate.id
  http_method = aws_api_gateway_method.sessions_automate_options.http_method
  status_code = aws_api_gateway_method_response.sessions_automate_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# CORS - OPTIONS /sessions/{sessionId}/export
resource "aws_api_gateway_method" "sessions_export_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.sessions_export.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sessions_export_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_export.id
  http_method = aws_api_gateway_method.sessions_export_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "sessions_export_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_export.id
  http_method = aws_api_gateway_method.sessions_export_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "sessions_export_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.sessions_export.id
  http_method = aws_api_gateway_method.sessions_export_options.http_method
  status_code = aws_api_gateway_method_response.sessions_export_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# CORS - OPTIONS /api
resource "aws_api_gateway_method" "api_root_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.api_root.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "api_root_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.api_root.id
  http_method = aws_api_gateway_method.api_root_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "api_root_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.api_root.id
  http_method = aws_api_gateway_method.api_root_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "api_root_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.api_root.id
  http_method = aws_api_gateway_method.api_root_options.http_method
  status_code = aws_api_gateway_method_response.api_root_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# CORS - OPTIONS /api/v1
resource "aws_api_gateway_method" "api_v1_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.api_v1.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "api_v1_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.api_v1.id
  http_method = aws_api_gateway_method.api_v1_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "api_v1_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.api_v1.id
  http_method = aws_api_gateway_method.api_v1_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "api_v1_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.api_v1.id
  http_method = aws_api_gateway_method.api_v1_options.http_method
  status_code = aws_api_gateway_method_response.api_v1_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
  }
}

# Lambda permissions for API Gateway to invoke functions
resource "aws_lambda_permission" "session_manager" {
  statement_id  = "AllowAPIGatewayInvokeSessionManager"
  action        = "lambda:InvokeFunction"
  function_name = var.session_manager_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.assetql_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "style_embedding" {
  statement_id  = "AllowAPIGatewayInvokeStyleEmbedding"
  action        = "lambda:InvokeFunction"
  function_name = var.style_embedding_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.assetql_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "presign_upload" {
  statement_id  = "AllowAPIGatewayInvokePresignUpload"
  action        = "lambda:InvokeFunction"
  function_name = var.presign_upload_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.assetql_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "batch_creator" {
  statement_id  = "AllowAPIGatewayInvokeBatchCreator"
  action        = "lambda:InvokeFunction"
  function_name = var.batch_creator_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.assetql_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "feedback_handler" {
  statement_id  = "AllowAPIGatewayInvokeFeedbackHandler"
  action        = "lambda:InvokeFunction"
  function_name = var.feedback_handler_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.assetql_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "automation_trigger" {
  statement_id  = "AllowAPIGatewayInvokeAutomationTrigger"
  action        = "lambda:InvokeFunction"
  function_name = var.automation_trigger_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.assetql_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "export_handler" {
  statement_id  = "AllowAPIGatewayInvokeExportHandler"
  action        = "lambda:InvokeFunction"
  function_name = var.export_handler_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.assetql_api.execution_arn}/*/*"
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "dev" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id

  # Force redeployment on any method or integration change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api_root.id,
      aws_api_gateway_resource.api_v1.id,
      aws_api_gateway_rest_api.assetql_api.body,
      aws_api_gateway_resource.sessions.id,
      aws_api_gateway_resource.sessions_id.id,
      aws_api_gateway_resource.sessions_phase.id,
      aws_api_gateway_resource.sessions_automate.id,
      aws_api_gateway_resource.sessions_export.id,
      aws_api_gateway_resource.styles.id,
      aws_api_gateway_resource.presign.id,
      aws_api_gateway_resource.batches.id,
      aws_api_gateway_resource.feedback.id,
      aws_api_gateway_resource.assets.id,
      aws_api_gateway_resource.assets_id.id,
      aws_api_gateway_method.sessions_post.id,
      aws_api_gateway_method.sessions_list.id,
      aws_api_gateway_method.sessions_get.id,
      aws_api_gateway_method.sessions_phase_put.id,
      aws_api_gateway_method.sessions_automate_post.id,
      aws_api_gateway_method.sessions_export_post.id,
      aws_api_gateway_method.styles_post.id,
      aws_api_gateway_method.styles_list.id,
      aws_api_gateway_method.presign_post.id,
      aws_api_gateway_method.batches_post.id,
      aws_api_gateway_method.feedback_post.id,
      # aws_api_gateway_method.assets_get.id, # TODO: Uncomment in Phase 3
    ]))
  }

  # Ensure all integrations are created before deployment
  depends_on = [
    aws_api_gateway_integration.sessions_post,
    aws_api_gateway_integration.sessions_list,
    aws_api_gateway_integration.sessions_get,
    aws_api_gateway_integration.sessions_phase_put,
    aws_api_gateway_integration.sessions_automate_post,
    aws_api_gateway_integration.sessions_export_post,
    aws_api_gateway_integration.styles_post,
    aws_api_gateway_integration.styles_list,
    aws_api_gateway_integration.presign_post,
    aws_api_gateway_integration.batches_post,
    aws_api_gateway_integration.feedback_post,
  ]

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway stage
resource "aws_api_gateway_stage" "dev" {
  deployment_id = aws_api_gateway_deployment.dev.id
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  stage_name    = "dev"

  xray_tracing_enabled = true
}
