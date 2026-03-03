# API Gateway CORS Refactoring Plan

## Overview
This document outlines the comprehensive CORS refactoring for `infra/modules/api-gateway/main.tf` to ensure all API Gateway responses include proper CORS headers.

---

## PART 1: Global Gateway Responses

**Location:** Add after `aws_api_gateway_authorizer` resource (around line 22)

```hcl
# Global CORS Gateway Responses
# These ensure ALL API Gateway error responses include CORS headers
# Without these, 403/401/500 errors from the gateway have no CORS headers
# and browsers show network errors instead of the real error

resource "aws_api_gateway_gateway_response" "cors_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "cors_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "cors_unauthorized" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  response_type = "UNAUTHORIZED"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}
```

---

## PART 2: Reusable CORS Locals

**Location:** Add after `data "aws_region"` block (around line 3)

```hcl
# Data source for current AWS region
data "aws_region" "current" {}

# Reusable CORS configuration
locals {
  cors_headers = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  cors_header_values = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
```

---

## PART 3: Fix ALL Existing OPTIONS Methods

### Pattern to Apply

For EVERY OPTIONS method, ensure this exact structure:

```hcl
# CORS - OPTIONS /resource
resource "aws_api_gateway_method" "resource_options" {
  rest_api_id   = aws_api_gateway_rest_api.assetql_api.id
  resource_id   = aws_api_gateway_resource.resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "resource_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = aws_api_gateway_method.resource_options.http_method
  type        = "MOCK"

  depends_on = [aws_api_gateway_method.resource_options]

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "resource_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = aws_api_gateway_method.resource_options.http_method
  status_code = "200"

  response_parameters = local.cors_headers
}

resource "aws_api_gateway_integration_response" "resource_options" {
  rest_api_id = aws_api_gateway_rest_api.assetql_api.id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = aws_api_gateway_method.resource_options.http_method
  status_code = "200"

  depends_on = [
    aws_api_gateway_integration.resource_options,
    aws_api_gateway_method_response.resource_options
  ]

  response_parameters = local.cors_header_values
}
```

### Routes to Update

Apply the above pattern to ALL of these routes:

1. ✅ `/sessions` - sessions_options
2. ✅ `/sessions/{sessionId}` - sessions_id_options  
3. ✅ `/sessions/{sessionId}/phase` - sessions_phase_options
4. ✅ `/styles` - styles_options
5. ✅ `/styles/{styleProfileId}` - style_profile_options (already correct)
6. ✅ `/presign` - presign_options
7. ✅ `/batches` - batches_options
8. ✅ `/feedback` - feedback_options
9. ❓ `/assets/{assetId}` - Check if exists, add if missing

### Key Changes for Each:

1. **Add `depends_on` to integration:**
   ```hcl
   depends_on = [aws_api_gateway_method.resource_options]
   ```

2. **Replace hardcoded response_parameters with locals:**
   - Method response: `response_parameters = local.cors_headers`
   - Integration response: `response_parameters = local.cors_header_values`

3. **Ensure integration_response has depends_on:**
   ```hcl
   depends_on = [
     aws_api_gateway_integration.resource_options,
     aws_api_gateway_method_response.resource_options
   ]
   ```

---

## PART 4: Update Deployment Triggers

**Location:** In `aws_api_gateway_deployment` resource triggers

### Add to triggers redeployment list:

```hcl
triggers = {
  redeployment = sha1(jsonencode([
    # ... existing resources ...
    aws_api_gateway_gateway_response.cors_4xx.id,
    aws_api_gateway_gateway_response.cors_5xx.id,
    aws_api_gateway_gateway_response.cors_unauthorized.id,
    # ... rest of resources ...
  ]))
}
```

---

## Implementation Steps

1. **Add locals block** (Part 2) - after data source
2. **Add gateway responses** (Part 1) - after authorizer
3. **Update each OPTIONS method** (Part 3) - one by one
4. **Update deployment triggers** (Part 4) - at the end

---

## Benefits

✅ **Global error handling** - All 4xx/5xx responses include CORS headers
✅ **DRY principle** - CORS headers defined once in locals
✅ **Consistent pattern** - All OPTIONS methods follow same structure
✅ **Proper dependencies** - Prevents Terraform race conditions
✅ **Browser-friendly errors** - Real error messages visible in browser console

---

## Testing After Deployment

1. Test OPTIONS preflight: `curl -X OPTIONS https://api.../styles -H "Origin: http://localhost:3000"`
2. Test 401 error: Call endpoint without auth token - should see CORS headers
3. Test 403 error: Call with invalid token - should see CORS headers
4. Test 404 error: Call non-existent route - should see CORS headers

---

## File Size Note

Due to the extensive nature of these changes (affecting 8-9 OPTIONS methods + 3 gateway responses + locals + deployment triggers), this refactoring should be done carefully with:
- Terraform plan review before apply
- Incremental testing after deployment
- Rollback plan if issues arise
