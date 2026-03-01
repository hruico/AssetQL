# Lambda Layer for Common Dependencies
resource "aws_lambda_layer_version" "common_dependencies" {
  filename            = "${path.root}/../layers/common-dependencies.zip"
  layer_name          = "AssetQL-CommonDependencies-${var.environment}"
  compatible_runtimes = ["nodejs20.x"]
  description         = "Common dependencies: AWS SDK, uuid"

  # Force update when zip changes
  source_code_hash = filebase64sha256("${path.root}/../layers/common-dependencies.zip")
}

# Lambda Layer for Image Processing Dependencies
resource "aws_lambda_layer_version" "image_processing" {
  filename            = "${path.root}/../layers/image-processing.zip"
  layer_name          = "AssetQL-ImageProcessing-${var.environment}"
  compatible_runtimes = ["nodejs20.x"]
  description         = "Image processing dependencies: sharp, archiver, s3-request-presigner"

  # Force update when zip changes
  source_code_hash = filebase64sha256("${path.root}/../layers/image-processing.zip")
}
