# Backend Dockerfile for MeetSonar
FROM node:20-alpine

# Install dependencies for native modules and development tools
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p dist

# Expose port
EXPOSE 5000

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]
