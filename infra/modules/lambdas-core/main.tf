# Lambda Core Module - Dependency Tier 1
#
# This module contains foundational Lambda functions that have no dependency on Bedrock Agents.
# These Lambdas are used as Action Groups by Bedrock Agents, so they must be created first.
# The agents module depends on this module's outputs.
#
# Split rationale: Breaking circular dependency where agents need Lambda ARNs and 
# feedback_handler Lambda needs Agent IDs. Core Lambdas → Agents → API Lambdas.

resource "aws_lambda_function" "style_embedding" {
  filename         = "../../lambdas/style-embedding.zip"
  function_name    = "AssetQL-StyleEmbedding-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 1024
  timeout         = 30

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
      DYNAMODB_STYLES_TABLE = var.styles_table_name
      FEEDBACK_TABLE_NAME = var.feedback_table_name
      SESSIONS_TABLE_NAME = var.sessions_table_name
      SQS_QUEUE_URL = var.sqs_queue_url
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "action_get_feedback_ledger" {
  filename         = "../../lambdas/action-get-feedback-ledger.zip"
  function_name    = "AssetQL-ActionGetFeedbackLedger-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 256
  timeout         = 30

  environment {
    variables = {
      FEEDBACK_TABLE_NAME = var.feedback_table_name
      SESSIONS_TABLE_NAME = var.sessions_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "action_refine_prompt" {
  filename         = "../../lambdas/action-refine-prompt.zip"
  function_name    = "AssetQL-ActionRefinePrompt-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 512
  timeout         = 60

  environment {
    variables = {
      SESSIONS_TABLE_NAME = var.sessions_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "image_generator" {
  filename         = "../../lambdas/image-generator.zip"
  function_name    = "AssetQL-ImageGenerator-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 1024
  timeout         = 300

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
      SQS_QUEUE_URL = var.sqs_queue_url
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "session_manager" {
  filename         = "../../lambdas/session-manager.zip"
  function_name    = "AssetQL-SessionManager-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 256
  timeout         = 30

  environment {
    variables = {
      SESSIONS_TABLE_NAME = var.sessions_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "batch_creator" {
  filename         = "../../lambdas/batch-creator.zip"
  function_name    = "AssetQL-BatchCreator-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 512
  timeout         = 60

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
      SQS_QUEUE_URL = var.sqs_queue_url
      DYNAMODB_STYLES_TABLE  = var.styles_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "automation_trigger" {
  filename         = "../../lambdas/automation-trigger.zip"
  function_name    = "AssetQL-AutomationTrigger-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 256
  timeout         = 30

  environment {
    variables = {
      SESSIONS_TABLE_NAME = var.sessions_table_name
      TASKS_TABLE_NAME = var.tasks_table_name
      SQS_QUEUE_URL = var.sqs_queue_url
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "export_handler" {
  filename         = "../../lambdas/export-handler.zip"
  function_name    = "AssetQL-ExportHandler-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 1024
  timeout         = 300

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
      SESSIONS_TABLE_NAME = var.sessions_table_name
      TASKS_TABLE_NAME = var.tasks_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

# Shared IAM role for all Lambda functions
resource "aws_iam_role" "style_embedding_role" {
  name = "AssetQL-LambdaExecutionRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Attach AWS managed policy for basic Lambda execution
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.style_embedding_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for DynamoDB, Bedrock, SQS, and S3 access
resource "aws_iam_role_policy" "shared_lambda_policy" {
  name = "AssetQL-SharedLambdaPolicy-${var.environment}"
  role = aws_iam_role.style_embedding_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${var.feedback_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.sessions_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.styles_table_name}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/amazon.nova-micro-v1:0",
          "arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock-agent-runtime:InvokeAgent"
        ]
        Resource = [
          "arn:aws:bedrock:*:*:agent/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage"
        ]
        Resource = [
            var.sqs_queue_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${var.feedback_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.sessions_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.styles_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.tasks_table_name}",           # ← add this
          "arn:aws:dynamodb:*:*:table/${var.tasks_table_name}/index/*"    # ← and this for GSI
        ]      
      }
    ]
  })
}
