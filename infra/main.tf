terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "assetql-terraform-state"
    key            = "assetql/dev/terraform.tfstate"
    region         = "ap-south-1"
    use_lockfile = true
    encrypt        = true
  }
}
provider "aws" {
  region = var.aws_region
}


module "storage" {
source = "./modules/storage"

project_name = var.project_name
environment  = var.environment
asset_tagger_arn = module.lambdas_core.asset_tagger_arn
}

output "assets_bucket_name" {
  value = module.storage.assets_bucket_name
}

output "api_base_url" {
  description = "Base URL for the AssetQL API"
  value       = module.api_gateway.api_base_url
}

output "websocket_api_endpoint" {
  description = "WebSocket API endpoint URL"
  value       = module.websocket_api.websocket_api_endpoint
}

module "database" {
  source = "./modules/database"
  # Add any required variables here if database/variables.tf has them
  # If the database module has no required variables, this empty block is fine
}

module "queues" {
  source = "./modules/queues"
  # Same — check if queues/variables.tf has required variables
}

module "layers" {
  source = "./modules/layers"
  environment = var.environment
}

module "lambdas_core" {
  source             = "./modules/lambdas-core"
  assets_bucket_name = module.storage.assets_bucket_name
  environment        = var.environment

  # Lambda Layers
  common_dependencies_layer_arn = module.layers.common_dependencies_layer_arn
  image_processing_layer_arn    = module.layers.image_processing_layer_arn

  # Database table names
  styles_table_name   = module.database.styles_table_name
  feedback_table_name = module.database.feedback_table_name
  sessions_table_name = module.database.sessions_table_name
  tasks_table_name    = module.database.tasks_table_name
  batches_table_name  = module.database.batches_table_name
  assets_table_name   = module.database.assets_table_name
  connections_table_name = module.database.connections_table_name

  # SQS queue configuration
  sqs_queue_url = module.queues.queue_url
  sqs_queue_arn = module.queues.queue_arn
  
  # DynamoDB Streams
  tasks_table_stream_arn = module.database.tasks_table_stream_arn
}

module "auth" {
    source = "./modules/auth"
}

module "agents" {
  source = "./modules/agents"
  
  action_get_feedback_ledger_arn = module.lambdas_core.action_get_feedback_ledger_arn
  action_refine_prompt_arn       = module.lambdas_core.action_refine_prompt_arn
  image_generator_arn            = module.lambdas_core.image_generator_arn
}

module "lambdas_api" {
  source = "./modules/lambdas-api"

  environment        = var.environment
  feedback_table_name = module.database.feedback_table_name
  sessions_table_name = module.database.sessions_table_name

  # Reuse shared IAM role from lambdas-core
  lambda_execution_role_arn = module.lambdas_core.lambda_execution_role_arn

  # Lambda Layer
  common_dependencies_layer_arn = module.layers.common_dependencies_layer_arn

  # Bedrock Agent configuration
  prompt_engineer_agent_id = module.agents.prompt_engineer_agent_id
  prompt_engineer_alias_id = module.agents.prompt_engineer_alias_id

  depends_on = [module.agents]
}

module "api_gateway" {
  source = "./modules/api-gateway"

  environment           = var.environment
  cognito_user_pool_arn = module.auth.user_pool_arn

  # Core Lambda ARNs from lambdas-core module
  session_manager_arn  = module.lambdas_core.session_manager_arn
  style_embedding_arn  = module.lambdas_core.style_embedding_arn
  batch_creator_arn    = module.lambdas_core.batch_creator_arn

  # API Lambda ARNs from lambdas-api module
  feedback_handler_arn = module.lambdas_api.feedback_handler_arn

  # Automation and export Lambda ARNs from lambdas-core module
  automation_trigger_arn = module.lambdas_core.automation_trigger_arn
  export_handler_arn     = module.lambdas_core.export_handler_arn
}

module "websocket_api" {
  source = "./modules/websocket-api"

  environment        = var.environment
  websocket_handler_arn = module.lambdas_core.websocket_handler_arn
  websocket_handler_invoke_arn = module.lambdas_core.websocket_handler_invoke_arn
}