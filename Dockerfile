# Production Dockerfile for Railway & Container Deployments
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code and assets
COPY src/ ./src/
COPY public/ ./public/

# Ensure persistent data directory exists
RUN mkdir -p /app/data/eventkit

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_PATH=/app/data/eventkit

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start server
CMD ["node", "src/server.js"]
