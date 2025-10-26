# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o nof0-api nof0.go

# Runtime stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy binary from builder
COPY --from=builder /build/nof0-api .
COPY --from=builder /build/etc ./etc

# Create non-root user
RUN addgroup -g 1000 nof0 && \
    adduser -D -u 1000 -G nof0 nof0 && \
    chown -R nof0:nof0 /app

USER nof0

EXPOSE 8888

CMD ["./nof0-api", "-f", "etc/nof0.yaml"]
