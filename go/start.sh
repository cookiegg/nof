#!/bin/bash

# NOF1 API Server Start Script

echo "Starting NOF1 Alpha Arena API Server..."

# Check if binary exists, if not build it
if [ ! -f "bin/nof0-api" ]; then
    echo "Binary not found. Building..."
    go build -o bin/nof0-api nof0.go
    if [ $? -ne 0 ]; then
        echo "Build failed!"
        exit 1
    fi
    echo "Build successful!"
fi

# Start the server
echo "Server starting on http://0.0.0.0:8888"
./bin/nof0-api -f etc/nof0.yaml
