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
}

output "assets_bucket_name" {
  value = module.storage.assets_bucket_name
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

module "lambdas" {
  source             = "./modules/lambdas"
  assets_bucket_name = module.storage.assets_bucket_name
  environment        = var.environment

  # Database table names
  styles_table_name   = module.database.styles_table_name
  feedback_table_name = module.database.feedback_table_name
  sessions_table_name = module.database.sessions_table_name

  # SQS queue configuration
  sqs_queue_url = module.queues.queue_url
  sqs_queue_arn = module.queues.queue_arn
}

module "auth" {
    source = "./modules/auth"
}

module "agents" {
  source = "./modules/agents"
  
  action_get_feedback_ledger_arn = module.lambdas.action_get_feedback_ledger_arn
  action_refine_prompt_arn       = module.lambdas.action_refine_prompt_arn
  image_generator_arn            = module.lambdas.image_generator_arn
}