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
      S3_BUCKET = var.assets_bucket_name  # This is where you set it!
      DYNAMODB_STYLES_TABLE = "AssetQL-styles"
    }
  }

  tracing_config {
    mode = "Active"  # X-Ray tracing
  }
}