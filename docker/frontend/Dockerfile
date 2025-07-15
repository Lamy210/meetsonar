# Frontend Dockerfile for MeetSonar
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev:client"]
