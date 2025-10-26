.PHONY: help run build clean test deps

# Variables
APP_NAME=nof0-api
CONFIG_FILE=etc/nof0.yaml
BUILD_DIR=bin

help: ## Display this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

deps: ## Install dependencies
	go mod download
	go mod tidy

run: ## Run the application in development mode
	go run nof0.go -f $(CONFIG_FILE)

build: ## Build the application
	@mkdir -p $(BUILD_DIR)
	go build -o $(BUILD_DIR)/$(APP_NAME) nof0.go
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)"

build-linux: ## Build for Linux
	@mkdir -p $(BUILD_DIR)
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/$(APP_NAME)-linux nof0.go
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)-linux"

build-windows: ## Build for Windows
	@mkdir -p $(BUILD_DIR)
	GOOS=windows GOARCH=amd64 go build -o $(BUILD_DIR)/$(APP_NAME).exe nof0.go
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME).exe"

clean: ## Clean build artifacts
	rm -rf $(BUILD_DIR)
	go clean

test: ## Run tests
	go test -v ./...

lint: ## Run linter
	golangci-lint run

fmt: ## Format code
	go fmt ./...
	gofmt -s -w .

check: fmt lint test ## Run all checks (format, lint, test)

install: build ## Install the binary
	@cp $(BUILD_DIR)/$(APP_NAME) $(GOPATH)/bin/
	@echo "Installed to $(GOPATH)/bin/$(APP_NAME)"
