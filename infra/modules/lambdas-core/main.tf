# Lambda Core Module - Dependency Tier 1
#
# This module contains foundational Lambda functions that have no dependency on Bedrock Agents.
# These Lambdas are used as Action Groups by Bedrock Agents, so they must be created first.
# The agents module depends on this module's outputs.
#
# Split rationale: Breaking circular dependency where agents need Lambda ARNs and 
# feedback_handler Lambda needs Agent IDs. Core Lambdas → Agents → API Lambdas.

resource "aws_lambda_function" "presign_upload" {
  filename         = "${path.root}/../lambdas/presign-upload.zip"
  function_name    = "AssetQL-PresignUpload-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 256
  timeout         = 10

  layers = [var.common_dependencies_layer_arn]

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "style_embedding" {
  filename         = "${path.root}/../lambdas/style-embedding.zip"
  function_name    = "AssetQL-StyleEmbedding-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 1024
  timeout         = 30

  layers = [var.common_dependencies_layer_arn]

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
      STYLES_TABLE_NAME = var.styles_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "action_get_feedback_ledger" {
  filename         = "${path.root}/../lambdas/action-get-feedback-ledger.zip"
  function_name    = "AssetQL-ActionGetFeedbackLedger-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 256
  timeout         = 30

  layers = [var.common_dependencies_layer_arn]

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
  filename         = "${path.root}/../lambdas/action-refine-prompt.zip"
  function_name    = "AssetQL-ActionRefinePrompt-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 512
  timeout         = 60

  layers = [var.common_dependencies_layer_arn]

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
  filename         = "${path.root}/../lambdas/image-generator.zip"
  function_name    = "AssetQL-ImageGenerator-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 1024
  timeout         = 300

  layers = [var.common_dependencies_layer_arn]

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
      SQS_QUEUE_URL = var.sqs_queue_url
      STYLES_TABLE_NAME = var.styles_table_name
      TASKS_TABLE_NAME = var.tasks_table_name
      BATCHES_TABLE_NAME = var.batches_table_name
      ASSETS_TABLE_NAME = var.assets_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

# SQS Event Source Mapping for image-generator
resource "aws_lambda_event_source_mapping" "image_generator_sqs" {
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.image_generator.arn
  batch_size       = 1  # Process one message at a time for better error handling
  enabled          = true

  # Retry configuration
  function_response_types = ["ReportBatchItemFailures"]
  
  scaling_config {
    maximum_concurrency = 10  # Max 10 concurrent executions
  }
}

resource "aws_lambda_function" "session_manager" {
  filename         = "${path.root}/../lambdas/session-manager.zip"
  function_name    = "AssetQL-SessionManager-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 256
  timeout         = 30

  layers = [var.common_dependencies_layer_arn]

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
  filename         = "${path.root}/../lambdas/batch-creator.zip"
  function_name    = "AssetQL-BatchCreator-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 512
  timeout         = 60

  layers = [var.common_dependencies_layer_arn]

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
      SQS_QUEUE_URL = var.sqs_queue_url
      STYLES_TABLE_NAME = var.styles_table_name
      BATCHES_TABLE_NAME = var.batches_table_name
      TASKS_TABLE_NAME = var.tasks_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "automation_trigger" {
  filename         = "${path.root}/../lambdas/automation-trigger.zip"
  function_name    = "AssetQL-AutomationTrigger-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 256
  timeout         = 30

  layers = [var.common_dependencies_layer_arn]

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
  filename         = "${path.root}/../lambdas/export-handler.zip"
  function_name    = "AssetQL-ExportHandler-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 1024
  timeout         = 300

  layers = [
    var.common_dependencies_layer_arn,
    var.image_processing_layer_arn
  ]

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

resource "aws_lambda_function" "asset_tagger" {
  filename         = "${path.root}/../lambdas/asset-tagger.zip"
  function_name    = "AssetQL-AssetTagger-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 1024
  timeout         = 60

  layers = [
    var.common_dependencies_layer_arn,
    var.image_processing_layer_arn
  ]

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
      ASSETS_TABLE_NAME = var.assets_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_function" "websocket_handler" {
  filename         = "${path.root}/../lambdas/websocket-handler.zip"
  function_name    = "AssetQL-WebSocketHandler-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 256
  timeout         = 30

  layers = [var.common_dependencies_layer_arn]

  environment {
    variables = {
      CONNECTIONS_TABLE_NAME = var.connections_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

# DynamoDB Streams Event Source Mapping for websocket-handler
resource "aws_lambda_event_source_mapping" "websocket_handler_streams" {
  event_source_arn  = var.tasks_table_stream_arn
  function_name     = aws_lambda_function.websocket_handler.arn
  starting_position = "LATEST"
  batch_size        = 10
  enabled           = true

  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["MODIFY"]
        dynamodb = {
          NewImage = {
            status = {
              S = ["completed", "failed"]
            }
          }
        }
      })
    }
  }
}

resource "aws_lambda_function" "export_orchestrator" {
  filename         = "${path.root}/../lambdas/export-orchestrator.zip"
  function_name    = "AssetQL-ExportOrchestrator-${var.environment}"
  role            = aws_iam_role.style_embedding_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  memory_size     = 1024
  timeout         = 300

  layers = [
    var.common_dependencies_layer_arn,
    var.image_processing_layer_arn
  ]

  environment {
    variables = {
      S3_BUCKET = var.assets_bucket_name
      ASSETS_TABLE_NAME = var.assets_table_name
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
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          "arn:aws:dynamodb:ap-south-1:*:table/AssetQL-*",
          "arn:aws:dynamodb:ap-south-1:*:table/AssetQL-*/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/*",
          "arn:aws:bedrock:*:*:inference-profile/*"
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
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
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
          "arn:aws:s3:::${var.assets_bucket_name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:DescribeStream",
          "dynamodb:ListStreams"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${var.tasks_table_name}/stream/*"
        ]
      }
    ]
  })
}
