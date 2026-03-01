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

output "assets_bucket_name" {
  value = aws_s3_bucket.assets.id
}

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

resource "null_resource" "build_lambdas" {
  # This "trigger" tells Terraform: "If any .js file in the lambdas folder changes, 
  # run the build script again."
  triggers = {
    code_hash = sha256(join("", [
      for f in fileset("${path.module}/lambdas", "**/*.js") : filesha256("${path.module}/lambdas/${f}")
    ]))
  }

  provisioner "local-exec" {
    # This command runs your new build script
    command = "bash ${path.module}/build.sh"
  }
}

module "lambdas" {
  source = "./modules/lambdas"
  assets_bucket_name = module.storage.assets_bucket_name
  environment        = var.environment
}