#!/bin/bash

# NOF0 API Integration Test Runner
# Starts server, runs integration tests, then stops server

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/.."

echo "========================================="
echo "NOF0 API Integration Test Suite"
echo "========================================="
echo ""

# Check if server is already running
if lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Server already running on port 8888${NC}"
    echo "Using existing server instance..."
    SERVER_STARTED=false
else
    # Build the application
    echo -e "${BLUE}Building application...${NC}"
    if ! go build -o nof0-api ./nof0.go; then
        echo -e "${RED}✗ Build failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Build successful${NC}"
    echo ""

    # Start server
    echo -e "${BLUE}Starting server on port 8888...${NC}"
    ./nof0-api -f etc/nof0.yaml > server.log 2>&1 &
    SERVER_PID=$!
    SERVER_STARTED=true

    # Wait for server to start
    echo "Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:8888/api/crypto-prices > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Server ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}✗ Server failed to start within 30 seconds${NC}"
            if [ "$SERVER_STARTED" = true ]; then
                kill $SERVER_PID 2>/dev/null || true
            fi
            cat server.log
            exit 1
        fi
        sleep 1
        echo -n "."
    done
    echo ""
fi

# Function to cleanup on exit
cleanup() {
    if [ "$SERVER_STARTED" = true ] && [ ! -z "$SERVER_PID" ]; then
        echo ""
        echo -e "${BLUE}Stopping server...${NC}"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Server stopped${NC}"
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Run integration tests
echo ""
echo -e "${YELLOW}Running integration tests...${NC}"
echo ""

if go test ./test/... -v; then
    echo ""
    echo -e "${GREEN}✓ All integration tests passed!${NC}"
    EXIT_CODE=0
else
    echo ""
    echo -e "${RED}✗ Integration tests failed${NC}"
    EXIT_CODE=1
fi

# Test individual endpoints
echo ""
echo -e "${YELLOW}Testing individual endpoints...${NC}"
echo ""

test_endpoint() {
    local endpoint=$1
    local name=$2

    echo -n "Testing $name... "
    if curl -sf "http://localhost:8888/api/$endpoint" > /dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        EXIT_CODE=1
    fi
}

test_endpoint "crypto-prices" "Crypto Prices"
test_endpoint "leaderboard" "Leaderboard"
test_endpoint "trades" "Trades"
test_endpoint "since-inception-values" "Since Inception"
test_endpoint "account-totals" "Account Totals"
test_endpoint "analytics" "Analytics"
test_endpoint "analytics/qwen3-max" "Model Analytics"

echo ""
echo "========================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Integration tests completed successfully!${NC}"
else
    echo -e "${RED}Integration tests failed!${NC}"
fi
echo "========================================="
echo ""

# Show server log if there were errors
if [ $EXIT_CODE -ne 0 ] && [ "$SERVER_STARTED" = true ]; then
    echo "Server log:"
    cat server.log
fi

exit $EXIT_CODE
