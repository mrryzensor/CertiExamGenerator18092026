# ==============================================================================
# Stage 1: Build Vite React Frontend
# ==============================================================================
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Ensure devDependencies are installed during build stage regardless of host/Coolify flags
ENV NODE_ENV=development

# Copy dependency definitions
COPY package*.json ./
RUN npm ci --include=dev

# Copy project files and compile Vite build
COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Production Runner
# ==============================================================================
FROM node:24-bookworm-slim AS runner
WORKDIR /app

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled React frontend
COPY --from=builder /app/dist ./dist

# Copy backend server code and configuration
COPY server ./server
COPY tsconfig.json ./

# Configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Persistent storage mount point for Coolify / Docker volume
VOLUME ["/app/data"]

# Application runs strictly on port 3000
EXPOSE 3000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start server on port 3000
CMD ["npx", "tsx", "server/index.ts"]
