#!/bin/bash

# AssetQL - Watch all logs with colors and filtering
# Usage: 
#   ./watch-logs.sh              # All logs
#   ./watch-logs.sh errors       # Errors only
#   ./watch-logs.sh session      # Filter by keyword

REGION="ap-south-1"
FILTER="${1:-}"

# All deployed Lambda functions
LAMBDA_FUNCTIONS=(
  "AssetQL-SessionManager-dev"
  "AssetQL-StyleEmbedding-dev"
  "AssetQL-BatchCreator-dev"
  "AssetQL-ImageGenerator-dev"
  "AssetQL-AssetTagger-dev"
  "AssetQL-ActionGetFeedbackLedger-dev"
  "AssetQL-ActionRefinePrompt-dev"
  "AssetQL-WebSocketHandler-dev"
  "AssetQL-FeedbackHandler-dev"
  "AssetQL-ExportHandler-dev"
  "AssetQL-ExportOrchestrator-dev"
  "AssetQL-AutomationTrigger-dev"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Component colors (cycling through available colors)
declare -A COLORS=(
  ["AssetQL-SessionManager-dev"]=$YELLOW
  ["AssetQL-StyleEmbedding-dev"]=$CYAN
  ["AssetQL-BatchCreator-dev"]=$GREEN
  ["AssetQL-ImageGenerator-dev"]=$BLUE
  ["AssetQL-AssetTagger-dev"]=$MAGENTA
  ["AssetQL-ActionGetFeedbackLedger-dev"]=$RED
  ["AssetQL-ActionRefinePrompt-dev"]=$GREEN
  ["AssetQL-WebSocketHandler-dev"]=$CYAN
  ["AssetQL-FeedbackHandler-dev"]=$YELLOW
  ["AssetQL-ExportHandler-dev"]=$BLUE
  ["AssetQL-ExportOrchestrator-dev"]=$MAGENTA
  ["AssetQL-AutomationTrigger-dev"]=$RED
)

echo "🔍 Watching AssetQL logs (12 Lambda functions)..."
if [ -n "$FILTER" ]; then
  echo "📌 Filter: $FILTER"
fi
echo "Press Ctrl+C to stop"
echo "Note: Only functions that have been invoked will show logs"
echo ""

# Function to tail logs with color
tail_with_color() {
  local func=$1
  local color=${COLORS[$func]}
  local short_name=$(echo $func | sed 's/AssetQL-//g' | sed 's/-dev//g')
  
  if [ "$FILTER" == "errors" ]; then
    aws logs tail "/aws/lambda/$func" \
      --follow \
      --format short \
      --filter-pattern "ERROR" \
      --region $REGION \
      --since 5m 2>/dev/null | while read line; do
        echo -e "${color}[$short_name]${NC} ${RED}$line${NC}"
      done &
  elif [ -n "$FILTER" ]; then
    aws logs tail "/aws/lambda/$func" \
      --follow \
      --format short \
      --region $REGION \
      --since 5m 2>/dev/null | grep -i "$FILTER" | while read line; do
        echo -e "${color}[$short_name]${NC} $line"
      done &
  else
    aws logs tail "/aws/lambda/$func" \
      --follow \
      --format short \
      --region $REGION \
      --since 5m 2>/dev/null | while read line; do
        echo -e "${color}[$short_name]${NC} $line"
      done &
  fi
}

# Start tailing all Lambda functions
for func in "${LAMBDA_FUNCTIONS[@]}"; do
  tail_with_color "$func"
done

# Wait for all background processes
wait
