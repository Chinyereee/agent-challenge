# ─── ORACLE Agent — Docker Image ─────────────────────────────────────────────
# Base: official Bun image (elizaos CLI requires Bun as runtime)
FROM oven/bun:1.3-slim

# Install Node.js (needed by some ElizaOS plugins) + curl (healthcheck) + pnpm
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      nodejs \
      npm \
    && npm install -g pnpm@10 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─── Dependency layer (cached unless package.json changes) ───────────────────
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Source & config ─────────────────────────────────────────────────────────
COPY src/         ./src/
COPY character.json tsconfig.json ./

# Build TypeScript plugin
RUN pnpm build

# Persistent SQLite data directory
RUN mkdir -p /app/data

# ─── Runtime ─────────────────────────────────────────────────────────────────
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["bun", "run", "node_modules/@elizaos/cli/dist/index.js", \
     "start", "--character", "./character.json"]
