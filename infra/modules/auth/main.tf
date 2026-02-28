resource "aws_cognito_user_pool" "main" {
  name = "assetql-users"
  # Allow users to sign in with email
  username_attributes = ["email"]
  auto_verified_attributes = ["email"]
  # Password requirements
  password_policy {
    minimum_length    = 8
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
}

resource "aws_cognito_user_pool_client" "frontend" {
  name         = "assetql-frontend"
  user_pool_id = aws_cognito_user_pool.main.id
  # No client secret - this is a public browser app
  generate_secret = false
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}
