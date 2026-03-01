# Lambda API Module - Dependency Tier 2
# Core Lambdas → Agents → API Lambdas

# The feedback_handler is the bridge between user input and Bedrock Agent reasoning.
# It lives here because it needs Agent IDs at runtime, creating a dependency on
# the agents module that core Lambdas must not have.
resource "aws_lambda_function" "feedback_handler" {
  filename      = "../../lambdas/feedback-handler.zip"
  function_name = "AssetQL-FeedbackHandler-${var.environment}"
  role          = var.lambda_execution_role_arn  # Reuse shared role from lambdas-core
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  memory_size   = 512
  timeout       = 120

  layers = [var.common_dependencies_layer_arn]

  environment {
    variables = {
      FEEDBACK_TABLE_NAME      = var.feedback_table_name
      SESSIONS_TABLE_NAME      = var.sessions_table_name
      PROMPT_ENGINEER_AGENT_ID = var.prompt_engineer_agent_id
      PROMPT_ENGINEER_ALIAS_ID = var.prompt_engineer_alias_id
    }
  }

  tracing_config {
    mode = "Active"
  }
}

# Additional policy granting this tier permission to invoke Bedrock Agents at runtime.
# Note: bedrock-agent-runtime:InvokeAgent is the DATA PLANE action (actually calling an agent).
# This is different from bedrock:InvokeAgent which is the MANAGEMENT PLANE action.
# The core lambdas policy intentionally does NOT include this permission.
resource "aws_iam_role_policy" "agent_invocation_policy" {
  name = "AssetQL-AgentInvocationPolicy-${var.environment}"
  role = var.lambda_execution_role_arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["bedrock-agent-runtime:InvokeAgent"]
      Resource = [
        "arn:aws:bedrock:ap-south-1:*:agent/*",
        "arn:aws:bedrock:ap-south-1:*:agent-alias/*"
      ]
    }]
  })
}