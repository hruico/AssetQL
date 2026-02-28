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

module "database" {
source = "./modules/database"
}

module "queues" {
source = "./modules/queues"
}

module "auth" {
    source = "./modules/auth"
}