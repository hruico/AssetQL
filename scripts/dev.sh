#!/bin/bash

# AssetQL Development Mode
# Starts local frontend and monitors backend logs

clear

echo "╔════════════════════════════════════════╗"
echo "║   AssetQL Development Mode             ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if config exists
if [ ! -f config.private.sh ]; then
    echo "❌ Configuration not found!"
    echo ""
    echo "Run first-time setup:"
    echo "  ./scripts/setup.sh"
    exit 1
fi

# Check if .env.local exists
if [ ! -f frontend/.env.local ]; then
    echo "❌ Frontend environment not configured!"
    echo ""
    echo "Run first-time setup:"
    echo "  ./scripts/setup.sh"
    exit 1
fi

# Load configuration
source config.private.sh

echo "📋 Configuration:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  $API_BASE_URL"
echo "   Region:   $AWS_REGION"
echo ""
echo "💡 Tips:"
echo "   - Frontend runs locally (FREE)"
echo "   - Backend uses production AWS (pay per use)"
echo "   - Changes auto-reload in browser"
echo "   - Press Ctrl+C to stop"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development server..."
    kill $FRONTEND_PID 2>/dev/null
    kill $LOGS_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start frontend in background
echo "🚀 Starting frontend..."
cd frontend
pnpm dev > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

# Start log monitoring
echo "📊 Monitoring backend logs..."
echo ""
echo "════════════════════════════════════════"
echo ""

./scripts/watch-logs.sh &
LOGS_PID=$!

# Wait for processes
wait
