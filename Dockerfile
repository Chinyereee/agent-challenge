# ─── ORACLE Agent — Node.js only (no bun) ────────────────────────────────────
FROM node:23-slim

# Install pnpm + curl (for healthcheck)
RUN npm install -g pnpm@10 && apt-get update && apt-get install -y --no-install-recommends curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─── Dependency layer (cached unless package.json changes) ───────────────────
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Source & config ─────────────────────────────────────────────────────────
COPY src/         ./src/
COPY character.json tsconfig.json ./

# Compile TypeScript → dist/
RUN pnpm build

# Persistent SQLite data directory
RUN mkdir -p /app/data

# ─── Runtime ─────────────────────────────────────────────────────────────────
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
