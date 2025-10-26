#!/bin/bash

# NOF0 API Test Runner
# Runs all unit tests

set -e

echo "================================"
echo "NOF0 API Test Suite"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/.."

echo -e "${YELLOW}Running unit tests...${NC}"
echo ""

# Run all unit tests
if go test ./internal/... -v; then
    echo ""
    echo -e "${GREEN}✓ All unit tests passed!${NC}"
else
    echo ""
    echo -e "${RED}✗ Unit tests failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Running benchmarks...${NC}"
echo ""

# Run benchmarks
go test ./internal/... -bench=. -benchmem -run=^$ | grep -E "Benchmark|PASS"

echo ""
echo -e "${YELLOW}Generating coverage report...${NC}"
echo ""

# Generate coverage
go test ./internal/... -coverprofile=coverage.out
COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}')

echo ""
echo -e "${GREEN}Total Coverage: ${COVERAGE}${NC}"

echo ""
echo "================================"
echo -e "${GREEN}Test suite completed successfully!${NC}"
echo "================================"
echo ""
echo "Coverage report: coverage.out"
echo "View HTML report: go tool cover -html=coverage.out"
echo ""
