# Lambda API Module - Dependency Tier 2
#
# This module contains API-facing Lambda functions that invoke Bedrock Agents.
# These Lambdas depend on Agent IDs from the agents module, so they must be created after agents.
# This module reuses the shared IAM role from lambdas-core to avoid duplication.
#
# Split rationale: Breaking circular dependency where agents need Lambda ARNs and 
# feedback_handler Lambda needs Agent IDs. Core Lambdas → Agents → API Lambdas.

resource "aws_iam_role_policy" "agent_invocation_policy" {
  name = "AssetQL-AgentInvocationPolicy-${var.environment}"
  role = var.lambda_execution_role_arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["bedrock-agent-runtime:InvokeAgent"]
      Resource = [
        # Scoped to agents in your specific account
        "arn:aws:bedrock:ap-south-1:*:agent/*",
        "arn:aws:bedrock:ap-south-1:*:agent-alias/*"
      ]
    }]
  })
}
