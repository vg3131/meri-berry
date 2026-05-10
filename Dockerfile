# ── Stage 1: Build frontend ────────────────────────────────────────────────
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend ─────────────────────────────────────────────────
FROM node:22-alpine AS backend
WORKDIR /app
# better-sqlite3 is a native module — needs build tools to compile for Alpine
RUN apk add --no-cache python3 make g++
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ── Stage 3: Production image ──────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# node_modules contains the compiled better-sqlite3 binary for linux/alpine —
# copy from the build stage so we don't need build tools here
COPY --from=backend /app/node_modules ./node_modules

# Compiled TypeScript
COPY --from=backend /app/dist ./dist

# SQL files are not emitted by tsc — copy them alongside the compiled output
COPY --from=backend /app/src/db/migrations ./dist/db/migrations
COPY --from=backend /app/src/db/seeds      ./dist/db/seeds

# Built React app — served as static files by Fastify
COPY --from=frontend /app/dist ./public

# Persistent SQLite data lives here (mount a volume at /data)
RUN mkdir -p /data

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3001
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/meri-berry.db

ENTRYPOINT ["./entrypoint.sh"]
