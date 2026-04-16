# WRDO Cave — Production Docker Image
# Builds the WRDO variant and serves with Node.js production server.

FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Build WRDO variant
RUN npm run build:wrdo

# Production stage — just Node.js + built files + server
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-production.mjs ./
COPY --from=builder /app/package.json ./

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

USER node
CMD ["node", "server-production.mjs"]
