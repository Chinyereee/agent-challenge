# ─── ORACLE Agent — Node.js only (no bun, no curl) ───────────────────────────
FROM node:23-slim

ENV NODE_ENV=production
ENV DATABASE_URL=sqlite:./data/oracle.sqlite

# Install pnpm only — no apt-get needed (healthcheck uses Node.js)
RUN npm install -g pnpm@10

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

# Pure Node.js healthcheck — no curl dependency
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
