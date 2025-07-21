# Backend Dockerfile for MeetSonar
FROM oven/bun:1-alpine

# Install dependencies for native modules and development tools
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p dist

# Expose port
EXPOSE 5000

# Default command (can be overridden in docker-compose)
CMD ["bun", "run", "dev"]
