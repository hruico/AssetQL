# Data sources for building ARNs
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# IAM role for PromptEngineerAgent
resource "aws_iam_role" "prompt_engineer_agent_role" {
  name = "AssetQL-PromptEngineerAgentRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "bedrock.amazonaws.com"
      }
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
        ArnLike = {
          "aws:SourceArn" = "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:agent/*"
        }
      }
    }]
  })

  inline_policy {
    name = "BedrockModelAccess"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = [
          "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/amazon.nova-micro-v1:0"
        ]
      }]
    })
  }

  inline_policy {
    name = "LambdaInvokeAccess"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          var.action_get_feedback_ledger_arn,
          var.action_refine_prompt_arn
        ]
      }]
    })
  }
}

# IAM role for QualityGatekeeperAgent
resource "aws_iam_role" "quality_gatekeeper_agent_role" {
  name = "AssetQL-QualityGatekeeperAgentRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "bedrock.amazonaws.com"
      }
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
        ArnLike = {
          "aws:SourceArn" = "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:agent/*"
        }
      }
    }]
  })

  inline_policy {
    name = "BedrockModelAccess"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = [
          "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/amazon.nova-lite-v1:0"
        ]
      }]
    })
  }

  inline_policy {
    name = "LambdaInvokeAccess"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          var.image_generator_arn
        ]
      }]
    })
  }
}

# Bedrock Agent: PromptEngineerAgent
resource "aws_bedrockagent_agent" "prompt_engineer_agent" {
  agent_name              = "AssetQL-PromptEngineer"
  agent_resource_role_arn = aws_iam_role.prompt_engineer_agent_role.arn
  foundation_model        = "amazon.nova-micro-v1:0"
  instruction             = "You are a prompt refinement specialist. Use the GetFeedbackLedger action to retrieve session history, then use RefinePrompt to improve the master prompt based on user feedback while preserving locked style elements."
}

# Bedrock Agent: QualityGatekeeperAgent
resource "aws_bedrockagent_agent" "quality_gatekeeper_agent" {
  agent_name              = "AssetQL-QualityGatekeeper"
  agent_resource_role_arn = aws_iam_role.quality_gatekeeper_agent_role.arn
  foundation_model        = "amazon.nova-lite-v1:0"
  instruction             = "You are a quality control agent. Evaluate image generation results, manage batch state transitions, and determine when style is sufficiently locked for automation."
}

# Action Group: GetFeedbackLedger — gives the PromptEngineerAgent the ability
# to read the full feedback history for a session from DynamoDB

# Action Group: GetFeedbackLedger
# Action Group: GetFeedbackLedger

# Action Group: GetFeedbackLedger
resource "aws_bedrockagent_agent_action_group" "get_feedback_ledger" {
  agent_id          = aws_bedrockagent_agent.prompt_engineer_agent.id
  agent_version     = "DRAFT"
  action_group_name = "GetFeedbackLedger"
  description       = "Retrieves the complete feedback history, locked style elements, and active refinements for a given session"

  action_group_executor {
    lambda = var.action_get_feedback_ledger_arn
  }

  # Using api_schema with inline OpenAPI JSON — this is more reliably supported
  # across provider versions than the function_schema HCL block approach
  api_schema {
    payload = jsonencode({
      openapi = "3.0.0"
      info = {
        title   = "GetFeedbackLedger API"
        version = "1.0.0"
      }
      paths = {
        "/GetFeedbackLedger" = {
          get = {
            summary     = "Retrieve feedback history for a session"
            description = "Retrieves all feedback entries sorted by iteration number, along with locked style elements and active refinements"
            operationId = "GetFeedbackLedger"
            parameters = [
              {
                name        = "sessionId"
                in          = "query"
                required    = true
                description = "The unique identifier of the user's refinement session"
                schema = {
                  type = "string"
                }
              }
            ]
            responses = {
              "200" = {
                description = "Feedback history retrieved successfully"
                content = {
                  "application/json" = {
                    schema = {
                      type = "object"
                      properties = {
                        feedbackHistory    = { type = "array" }
                        lockedElements     = { type = "array" }
                        activeRefinements  = { type = "array" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
  }
}

# Action Group: RefinePrompt
resource "aws_bedrockagent_agent_action_group" "refine_prompt" {
  agent_id          = aws_bedrockagent_agent.prompt_engineer_agent.id
  agent_version     = "DRAFT"
  action_group_name = "RefinePrompt"
  description       = "Refines the master prompt using user feedback while preserving locked style elements"

  action_group_executor {
    lambda = var.action_refine_prompt_arn
  }

  api_schema {
    payload = jsonencode({
      openapi = "3.0.0"
      info = {
        title   = "RefinePrompt API"
        version = "1.0.0"
      }
      paths = {
        "/RefinePrompt" = {
          post = {
            summary     = "Refine the master prompt based on user feedback"
            description = "Calls Nova Micro to produce a refined prompt, respects locked elements, and saves result back to the session"
            operationId = "RefinePrompt"
            requestBody = {
              required = true
              content = {
                "application/json" = {
                  schema = {
                    type     = "object"
                    required = ["sessionId", "currentMasterPrompt", "feedbackSummary"]
                    properties = {
                      sessionId = {
                        type        = "string"
                        description = "The unique identifier of the user's refinement session"
                      }
                      currentMasterPrompt = {
                        type        = "string"
                        description = "The current version of the master prompt to be refined"
                      }
                      feedbackSummary = {
                        type        = "string"
                        description = "A summary of the user's feedback describing desired style changes"
                      }
                      lockedElements = {
                        type        = "string"
                        description = "JSON string array of style elements that must not be modified"
                      }
                    }
                  }
                }
              }
            }
            responses = {
              "200" = {
                description = "Prompt refined successfully"
                content = {
                  "application/json" = {
                    schema = {
                      type = "object"
                      properties = {
                        refinedPrompt            = { type = "string" }
                        updatedLockedElements    = { type = "array" }
                        updatedActiveRefinements = { type = "array" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
  }
}

# Agent alias for PromptEngineerAgent — provides a stable invocation endpoint
# Your Express server will call this alias ID, not the agent ID directly
resource "aws_bedrockagent_agent_alias" "prompt_engineer_alias" {
  agent_id         = aws_bedrockagent_agent.prompt_engineer_agent.id
  agent_alias_name = "live"
  description      = "Production alias for the PromptEngineer agent"
  
  # Omit routing_configuration to use the latest prepared version automatically
  depends_on = [
    aws_bedrockagent_agent_action_group.get_feedback_ledger,
    aws_bedrockagent_agent_action_group.refine_prompt
  ]
}

resource "aws_bedrockagent_agent_alias" "quality_gatekeeper_alias" {
  agent_id         = aws_bedrockagent_agent.quality_gatekeeper_agent.id
  agent_alias_name = "live"
  description      = "Production alias for the QualityGatekeeper agent"
  
  # Omit routing_configuration to use the latest prepared version automatically
}


# Lambda permissions for Bedrock Agent to invoke action Lambdas

# Permission for PromptEngineerAgent to invoke action-get-feedback-ledger
resource "aws_lambda_permission" "prompt_engineer_get_feedback" {
  statement_id  = "AllowBedrockPromptEngineerGetFeedback"
  action        = "lambda:InvokeFunction"
  function_name = var.action_get_feedback_ledger_arn
  principal     = "bedrock.amazonaws.com"
  
  # Wait for agent to be fully created
  depends_on = [aws_bedrockagent_agent.prompt_engineer_agent]
}

# Permission for PromptEngineerAgent to invoke action-refine-prompt
resource "aws_lambda_permission" "prompt_engineer_refine_prompt" {
  statement_id  = "AllowBedrockPromptEngineerRefinePrompt"
  action        = "lambda:InvokeFunction"
  function_name = var.action_refine_prompt_arn
  principal     = "bedrock.amazonaws.com"
  
  # Wait for agent to be fully created
  depends_on = [aws_bedrockagent_agent.prompt_engineer_agent]
}

# Permission for QualityGatekeeperAgent to invoke image-generator
resource "aws_lambda_permission" "quality_gatekeeper_image_generator" {
  statement_id  = "AllowBedrockQualityGatekeeperImageGenerator"
  action        = "lambda:InvokeFunction"
  function_name = var.image_generator_arn
  principal     = "bedrock.amazonaws.com"
  
  # Wait for agent to be fully created
  depends_on = [aws_bedrockagent_agent.quality_gatekeeper_agent]
}

# Additional permission for action-get-feedback-ledger (can be invoked by both agents if needed)
resource "aws_lambda_permission" "quality_gatekeeper_get_feedback" {
  statement_id  = "AllowBedrockQualityGatekeeperGetFeedback"
  action        = "lambda:InvokeFunction"
  function_name = var.action_get_feedback_ledger_arn
  principal     = "bedrock.amazonaws.com"
  
  # Wait for agent to be fully created
  depends_on = [aws_bedrockagent_agent.quality_gatekeeper_agent]
}
