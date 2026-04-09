# ─── ORACLE Agent — Production Container ─────────────────────────────────────
# Node.js only (no bun, no curl). Uses pnpm for reproducible installs.
# Health checks use a built-in Node.js one-liner — no extra system deps needed.
FROM node:23-slim

# ── Runtime environment ────────────────────────────────────────────────────────
# NODE_ENV=production disables dev-only code paths in ElizaOS and its deps.
ENV NODE_ENV=production
# Force SQLite instead of PGlite (WASM PostgreSQL) for faster cold-start.
ENV DATABASE_URL=sqlite:./data/oracle.sqlite
# Cap V8 heap to keep memory within Nosana job resource limits (4096 MB total).
ENV NODE_OPTIONS=--max-old-space-size=512
# Retry settings for pnpm install inside Docker (heavy transitive deps).
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_RETRIES=5

# ── Install pnpm globally ──────────────────────────────────────────────────────
# No apt-get needed — healthcheck uses Node.js, not curl.
RUN npm install -g pnpm@10

# ── Set working directory ──────────────────────────────────────────────────────
WORKDIR /app

# ── Dependency layer (cached unless package.json or lockfile changes) ──────────
# Copy manifests first so Docker reuses this layer on source-only changes.
COPY package.json pnpm-lock.yaml ./

# Skip optional deps (canvas, pdfjs-dist, etc.) that are unused and slow to fetch.
RUN pnpm install --frozen-lockfile --no-optional

# ── Copy source and config ─────────────────────────────────────────────────────
COPY src/           ./src/
COPY character.json tsconfig.json ./

# ── Compile TypeScript → dist/ ─────────────────────────────────────────────────
RUN pnpm build

# ── Create persistent data directory ──────────────────────────────────────────
# SQLite database and ElizaOS memory files are stored here.
RUN mkdir -p /app/data

# ── Expose HTTP port ───────────────────────────────────────────────────────────
EXPOSE 3000

# ── Health check ───────────────────────────────────────────────────────────────
# Hits the pre-boot health server (responds immediately) then ElizaOS once ready.
# interval=10s: check often so Nosana detects readiness quickly.
# start-period=30s: grace window while ElizaOS completes its cold-start.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# ── Start the agent ────────────────────────────────────────────────────────────
CMD ["node", "dist/index.js"]
