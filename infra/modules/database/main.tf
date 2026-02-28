# Batches table - tracks each batch job
resource "aws_dynamodb_table" "batches" {
  name         = "AssetQL-batches"
  billing_mode = "PAY_PER_REQUEST"  # No capacity planning needed
  hash_key     = "batchId"
  attribute { 
    name = "batchId"   
    type = "S" 
    }
  attribute { 
    name = "userId"    
    type = "S" 
    }
  attribute { 
    name = "createdAt" 
    type = "N" 
    }
  global_secondary_index {
    name            = "userId-createdAt-index"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  point_in_time_recovery { enabled = true }
}

# Assets table - tracks each generated image
resource "aws_dynamodb_table" "assets" {
  name         = "AssetQL-assets"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "assetId"
  attribute { 
    name = "assetId"   
    type = "S" 
    }
  attribute { 
    name = "batchId"   
    type = "S" 
    }
  attribute { 
    name = "createdAt" 
    type = "N" 
    }
  attribute { 
    name = "userId"    
    type = "S" 
    }
  attribute { 
    name = "category"  
    type = "S" 
    }
  global_secondary_index {
    name            = "batchId-createdAt-index"
    hash_key        = "batchId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "userId-category-index"
    hash_key        = "userId"
    range_key       = "category"
    projection_type = "ALL"
  }
  point_in_time_recovery { enabled = true }
}

# Tasks table - tracks each individual image generation job
resource "aws_dynamodb_table" "tasks" {
  name         = "AssetQL-tasks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "taskId"
  range_key    = "batchId"
  attribute { 
    name = "taskId"  
    type = "S" 
    }
  attribute { 
    name = "batchId" 
    type = "S" 
    }
  attribute { 
    name = "status"  
    type = "S" 
    }
  global_secondary_index {
    name            = "batchId-status-index"
    hash_key        = "batchId"
    range_key       = "status"
    projection_type = "ALL"
  }
  # Enable Streams so we can track progress in real-time
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  point_in_time_recovery { enabled = true }
}

# Styles table - saves user style profiles
resource "aws_dynamodb_table" "styles" {
  name         = "AssetQL-styles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "styleProfileId"
  attribute { 
    name = "styleProfileId" 
    type = "S" 
    }
  attribute { 
    name = "userId"         
    type = "S" 
    }
  attribute { 
    name = "createdAt"      
    type = "N" 
    }
  global_secondary_index {
    name            = "userId-createdAt-index"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  point_in_time_recovery { enabled = true }
}

# Connections table - tracks active WebSocket browser connections
resource "aws_dynamodb_table" "connections" {
  name         = "AssetQL-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"
  attribute { 
    name = "connectionId" 
    type = "S" 
    }
}
